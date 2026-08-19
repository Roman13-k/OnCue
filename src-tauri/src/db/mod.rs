mod usage;

use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime, State};

pub use usage::{close_all_open_sessions, repair_multi_day_sessions, sync_usage_sample};

pub struct Db(pub Mutex<Connection>);

pub fn finalize_on_shutdown<R: Runtime>(app: &AppHandle<R>) {
    use chrono::Local;

    let Some(db) = app.try_state::<Db>() else {
        return;
    };

    let Ok(conn) = db.0.lock() else {
        return;
    };

    let _ = close_all_open_sessions(&conn, Local::now());
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSessionRow {
    pub id: i64,
    pub app_name: String,
    pub app_path: String,
    pub started_at: String,
    pub ended_at: Option<String>,

    pub weekday: i64,
}

pub fn open(app: &AppHandle) -> Result<Db, String> {
    let path = db_file_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create database folder: {e}"))?;
    }

    let conn = Connection::open(&path).map_err(|e| format!("Failed to open database: {e}"))?;
    migrate(&conn)?;
    let _ = repair_multi_day_sessions(&conn);
    Ok(Db(Mutex::new(conn)))
}

pub fn db_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app_data_dir: {e}"))?;
    Ok(app_data.join("storage").join("oncue.db"))
}

fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS app_sessions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            app_name    TEXT NOT NULL,
            app_path    TEXT NOT NULL,
            started_at  TEXT NOT NULL,
            ended_at    TEXT,
            weekday     INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_app_sessions_path_started
            ON app_sessions (app_path, started_at);

        CREATE INDEX IF NOT EXISTS idx_app_sessions_open
            ON app_sessions (app_path)
            WHERE ended_at IS NULL;

        CREATE TABLE IF NOT EXISTS tracked_apps (
            app_path      TEXT PRIMARY KEY NOT NULL,
            app_name      TEXT NOT NULL,
            icon_data_url TEXT,
            updated_at    TEXT NOT NULL
        );
        "#,
    )
    .map_err(|e| format!("Database migration failed: {e}"))?;

    let _ = conn.execute("ALTER TABLE app_sessions DROP COLUMN hour", []);

    Ok(())
}

pub fn upsert_tracked_app(
    conn: &Connection,
    app_name: &str,
    app_path: &str,
    icon_data_url: Option<&str>,
    updated_at: &str,
) -> Result<(), String> {
    let existing: Option<Option<String>> = conn
        .query_row(
            "SELECT icon_data_url FROM tracked_apps WHERE app_path = ?1",
            params![app_path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("lookup tracked_app failed: {e}"))?;

    let icon = match (&existing, icon_data_url) {
        (_, Some(new_icon)) if !new_icon.is_empty() => Some(new_icon.to_string()),
        (Some(Some(old)), _) => Some(old.clone()),
        (Some(None), None) => None,
        (None, None) => None,
        _ => icon_data_url.map(str::to_string),
    };

    conn.execute(
        r#"
        INSERT INTO tracked_apps (app_path, app_name, icon_data_url, updated_at)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(app_path) DO UPDATE SET
            app_name = excluded.app_name,
            icon_data_url = COALESCE(excluded.icon_data_url, tracked_apps.icon_data_url),
            updated_at = excluded.updated_at
        "#,
        params![app_path, app_name, icon, updated_at],
    )
    .map_err(|e| format!("upsert tracked_app failed: {e}"))?;
    Ok(())
}

pub fn tracked_app_has_icon(conn: &Connection, app_path: &str) -> Result<bool, String> {
    let icon: Option<Option<String>> = conn
        .query_row(
            "SELECT icon_data_url FROM tracked_apps WHERE app_path = ?1",
            params![app_path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("lookup tracked_app icon failed: {e}"))?;

    Ok(matches!(icon, Some(Some(s)) if !s.is_empty()))
}

pub fn insert_session_start(
    conn: &Connection,
    app_name: &str,
    app_path: &str,
    started_at: &str,
    weekday: i64,
) -> Result<i64, String> {
    conn.execute(
        r#"
        INSERT INTO app_sessions (app_name, app_path, started_at, weekday)
        VALUES (?1, ?2, ?3, ?4)
        "#,
        params![app_name, app_path, started_at, weekday],
    )
    .map_err(|e| format!("INSERT session failed: {e}"))?;
    Ok(conn.last_insert_rowid())
}

pub fn end_session(conn: &Connection, id: i64, ended_at: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE app_sessions SET ended_at = ?1 WHERE id = ?2 AND ended_at IS NULL",
        params![ended_at, id],
    )
    .map_err(|e| format!("UPDATE session failed: {e}"))?;
    Ok(())
}

pub fn list_recent_sessions(conn: &Connection, limit: i64) -> Result<Vec<AppSessionRow>, String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, app_name, app_path, started_at, ended_at, weekday
            FROM app_sessions
            ORDER BY id DESC
            LIMIT ?1
            "#,
        )
        .map_err(|e| format!("prepare failed: {e}"))?;

    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(AppSessionRow {
                id: row.get(0)?,
                app_name: row.get(1)?,
                app_path: row.get(2)?,
                started_at: row.get(3)?,
                ended_at: row.get(4)?,
                weekday: row.get(5)?,
            })
        })
        .map_err(|e| format!("query failed: {e}"))?;

    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| format!("row failed: {e}"))?);
    }
    Ok(out)
}

#[allow(dead_code)]
pub fn count_by_weekday(conn: &Connection, app_path: &str, weekday: i64) -> Result<i64, String> {
    conn.query_row(
        r#"
        SELECT COUNT(*) FROM app_sessions
        WHERE app_path = ?1 AND weekday = ?2
        "#,
        params![app_path, weekday],
        |row| row.get(0),
    )
    .map_err(|e| format!("count failed: {e}"))
}

#[tauri::command]
pub fn db_list_recent_sessions(
    db: State<'_, Db>,
    limit: Option<i64>,
) -> Result<Vec<AppSessionRow>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    list_recent_sessions(&conn, limit.unwrap_or(50))
}

#[tauri::command]
pub fn db_insert_session_start(
    db: State<'_, Db>,
    app_name: String,
    app_path: String,
) -> Result<i64, String> {
    use chrono::{Datelike, Local};

    let now = Local::now();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    insert_session_start(
        &conn,
        &app_name,
        &app_path,
        &now.to_rfc3339(),
        now.weekday().num_days_from_monday() as i64,
    )
}
