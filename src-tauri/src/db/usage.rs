use std::collections::{HashMap, HashSet};
use std::path::Path;

use chrono::{DateTime, Datelike, Days, Local, NaiveDate, Timelike};
use rusqlite::Connection;

use crate::apps::icon_data_url_for;
use crate::process::{normalize_path, ProcessInfo};

use super::{
    end_session, insert_session_start, tracked_app_has_icon, upsert_tracked_app, AppSessionRow,
};

#[derive(Debug, Default)]
pub struct SyncStats {
    pub closed: usize,
    pub opened: usize,
    pub continued: usize,
}

pub fn close_all_open_sessions(
    conn: &Connection,
    now: DateTime<Local>,
) -> Result<usize, String> {
    let slot_at = floor_slot(now).to_rfc3339();
    let changed = conn
        .execute(
            "UPDATE app_sessions SET ended_at = ?1 WHERE ended_at IS NULL",
            rusqlite::params![slot_at],
        )
        .map_err(|e| format!("close all open sessions failed: {e}"))?;
    Ok(changed)
}

pub fn sync_usage_sample(
    conn: &Connection,
    apps: &[ProcessInfo],
    now: DateTime<Local>,
) -> Result<SyncStats, String> {
    let today = now.date_naive();
    let weekday = now.weekday().num_days_from_monday() as i64;
    let slot_at = floor_slot(now).to_rfc3339();

    let running: HashMap<String, ProcessInfo> = apps
        .iter()
        .filter_map(|app| {
            let path = app.exe_path.as_deref()?.trim();
            if path.is_empty() {
                return None;
            }
            Some((normalize_path(path), app.clone()))
        })
        .collect();

    for app in running.values() {
        refresh_tracked_app(conn, app, &slot_at)?;
    }

    let open = list_open_sessions(conn)?;
    let mut stats = SyncStats::default();
    let mut open_today: HashSet<String> = HashSet::new();
    let mut reopen: Vec<ProcessInfo> = Vec::new();

    for session in open {
        let key = normalize_path(&session.app_path);
        let session_day = parse_started_date(&session.started_at);

        if session_day.map(|d| d < today).unwrap_or(true) {

            let close_at = session_day
                .and_then(|d| d.checked_add_days(Days::new(1)))
                .map(start_of_day)
                .unwrap_or_else(|| start_of_day(today))
                .to_rfc3339();
            end_session(conn, session.id, &close_at)?;
            stats.closed += 1;
            if let Some(app) = running.get(&key) {
                reopen.push(app.clone());
            }
            continue;
        }

        if !running.contains_key(&key) {
            end_session(conn, session.id, &slot_at)?;
            stats.closed += 1;
            continue;
        }

        if open_today.contains(&key) {
            end_session(conn, session.id, &slot_at)?;
            stats.closed += 1;
            continue;
        }

        open_today.insert(key);
        stats.continued += 1;
    }

    for app in reopen {
        let Some(path) = app.exe_path.as_deref() else {
            continue;
        };
        let key = normalize_path(path);
        if open_today.contains(&key) {
            continue;
        }
        insert_session_start(conn, &app.name, path, &slot_at, weekday)?;
        let icon = icon_data_url_for(Path::new(path));
        let _ = upsert_tracked_app(conn, &app.name, path, icon.as_deref(), &slot_at);
        open_today.insert(key);
        stats.opened += 1;
    }

    for (key, app) in &running {
        if open_today.contains(key) {
            continue;
        }
        let Some(path) = app.exe_path.as_deref() else {
            continue;
        };
        insert_session_start(conn, &app.name, path, &slot_at, weekday)?;
        let icon = icon_data_url_for(Path::new(path));
        let _ = upsert_tracked_app(conn, &app.name, path, icon.as_deref(), &slot_at);
        open_today.insert(key.clone());
        stats.opened += 1;
    }

    Ok(stats)
}

pub fn repair_multi_day_sessions(conn: &Connection) -> Result<usize, String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, started_at, ended_at
            FROM app_sessions
            WHERE ended_at IS NOT NULL
            "#,
        )
        .map_err(|e| format!("prepare repair sessions failed: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| format!("query repair sessions failed: {e}"))?;

    let mut fixed = 0usize;
    for row in rows {
        let (id, started_at, ended_at) = row.map_err(|e| format!("row failed: {e}"))?;
        let Some(start_day) = parse_started_date(&started_at) else {
            continue;
        };
        let Some(end_day) = parse_started_date(&ended_at) else {
            continue;
        };
        let max_end = start_day
            .checked_add_days(Days::new(1))
            .unwrap_or(start_day);

        if end_day < max_end {
            continue;
        }
        if end_day == max_end {
            if let Ok(dt) = DateTime::parse_from_rfc3339(&ended_at) {
                let local = dt.with_timezone(&Local);
                if local.hour() == 0 && local.minute() == 0 && local.second() == 0 {
                    continue;
                }
            }
        }

        let close_at = start_of_day(max_end).to_rfc3339();
        if close_at == ended_at {
            continue;
        }
        conn.execute(
            "UPDATE app_sessions SET ended_at = ?1 WHERE id = ?2",
            rusqlite::params![close_at, id],
        )
        .map_err(|e| format!("repair session {id} failed: {e}"))?;
        fixed += 1;
    }

    Ok(fixed)
}

fn refresh_tracked_app(
    conn: &Connection,
    app: &ProcessInfo,
    updated_at: &str,
) -> Result<(), String> {
    let Some(path) = app.exe_path.as_deref() else {
        return Ok(());
    };
    let needs_icon = !tracked_app_has_icon(conn, path)?;
    let icon = if needs_icon {
        icon_data_url_for(Path::new(path))
    } else {
        None
    };
    upsert_tracked_app(conn, &app.name, path, icon.as_deref(), updated_at)
}

fn list_open_sessions(conn: &Connection) -> Result<Vec<AppSessionRow>, String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, app_name, app_path, started_at, ended_at, weekday
            FROM app_sessions
            WHERE ended_at IS NULL
            ORDER BY id ASC
            "#,
        )
        .map_err(|e| format!("prepare open sessions failed: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(AppSessionRow {
                id: row.get(0)?,
                app_name: row.get(1)?,
                app_path: row.get(2)?,
                started_at: row.get(3)?,
                ended_at: row.get(4)?,
                weekday: row.get(5)?,
            })
        })
        .map_err(|e| format!("query open sessions failed: {e}"))?;

    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| format!("row failed: {e}"))?);
    }
    Ok(out)
}

fn floor_slot(now: DateTime<Local>) -> DateTime<Local> {
    let minute = (now.minute() / 15) * 15;
    now.date_naive()
        .and_hms_opt(now.hour(), minute, 0)
        .and_then(|naive| naive.and_local_timezone(Local).single())
        .unwrap_or(now)
}

fn start_of_day(day: NaiveDate) -> DateTime<Local> {
    day.and_hms_opt(0, 0, 0)
        .and_then(|naive| naive.and_local_timezone(Local).single())
        .unwrap_or_else(Local::now)
}

fn parse_started_date(started_at: &str) -> Option<NaiveDate> {
    DateTime::parse_from_rfc3339(started_at)
        .ok()
        .map(|dt| dt.with_timezone(&Local).date_naive())
}
