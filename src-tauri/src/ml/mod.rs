pub mod autostart;

use std::collections::{HashMap, HashSet};

use chrono::{DateTime, Datelike, Local, NaiveDate, Timelike};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

pub use autostart::load_autostarts_internal;

use crate::apps::icon_data_url_for;
use crate::db::Db;

use autostart::{is_autostart_enabled, suggestion_id, MIN_SLOT_OBSERVATIONS};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitSuggestion {
    pub id: String,
    pub app: String,
    #[serde(default)]
    pub app_path: String,
    #[serde(default)]
    pub icon_data_url: Option<String>,
    pub weekday: i64,
    pub from: String,
    pub to: String,
    pub confidence: f64,
    pub autostart_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitSuggestionsResult {
    pub ok: bool,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub threshold: f64,
    #[serde(default)]
    pub suggestions: Vec<HabitSuggestion>,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Clone)]
struct SessionRow {
    app_name: String,
    app_path: String,
    started_at: String,
    ended_at: Option<String>,
    weekday: i64,
}

#[derive(Clone)]
struct AppMeta {
    app_name: String,
    icon_data_url: Option<String>,
}

#[tauri::command]
pub fn get_habit_suggestions(
    app: AppHandle,
    db: State<'_, Db>,
    threshold: Option<f64>,
) -> Result<HabitSuggestionsResult, String> {
    let threshold = threshold.unwrap_or(0.6);
    let now = Local::now();
    let today_weekday = now.weekday().num_days_from_monday() as i64;
    let now_minutes = (now.hour() * 60 + now.minute()) as i64;
    let autostarts = load_autostarts_internal(&app)?;

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    backfill_missing_tracked_apps(&conn)?;
    let sessions = load_sessions(&conn)?;
    let mut icons = load_icons(&conn)?;

    let mut by_path: HashMap<String, Vec<SessionRow>> = HashMap::new();
    for session in sessions {
        by_path
            .entry(session.app_path.clone())
            .or_default()
            .push(session);
    }

    let mut suggestions = Vec::new();
    for (path, app_sessions) in by_path {
        let Some((wd, slot, conf)) =
            best_for_app(&app_sessions, today_weekday, now_minutes, threshold)
        else {
            continue;
        };
        let (from, to) = slot_to_range(slot);
        let id = suggestion_id(&path, wd, &from);
        let mut meta = lookup_meta(&icons, &path);
        if meta.as_ref().and_then(|m| m.icon_data_url.as_ref()).is_none() {
            if let Some(icon) = ensure_icon_for_path(&conn, &path, &app_sessions) {
                if let Some(m) = meta.as_mut() {
                    m.icon_data_url = Some(icon.clone());
                } else {
                    meta = Some(AppMeta {
                        app_name: display_name(
                            app_sessions.first().map(|s| s.app_name.as_str()),
                            &path,
                        ),
                        icon_data_url: Some(icon.clone()),
                    });
                }
                let key = path.replace('/', "\\").to_lowercase();
                if let Some(m) = meta.clone() {
                    icons.insert(path.clone(), m.clone());
                    icons.insert(key, m);
                }
            }
        }
        let name = display_name(
            meta.as_ref()
                .map(|m| m.app_name.as_str())
                .or_else(|| app_sessions.first().map(|s| s.app_name.as_str())),
            &path,
        );
        let autostart_enabled = is_autostart_enabled(&autostarts, &path, wd, &from);
        suggestions.push(HabitSuggestion {
            id,
            app: name,
            app_path: path,
            icon_data_url: meta.and_then(|m| m.icon_data_url),
            weekday: wd,
            from,
            to,
            confidence: (conf * 1000.0).round() / 1000.0,
            autostart_enabled,
        });
    }

    suggestions.sort_by(|a, b| {
        b.confidence
            .partial_cmp(&a.confidence)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(HabitSuggestionsResult {
        ok: true,
        source: "db".into(),
        threshold,
        suggestions,
        error: None,
    })
}

fn best_for_app(
    sessions: &[SessionRow],
    today_weekday: i64,
    now_minutes: i64,
    threshold: f64,
) -> Option<(i64, i64, f64)> {
    let scores = frequency_scores(sessions);
    let mut best: Option<(i64, i64, f64)> = None;
    for ((wd, slot), conf) in scores {
        if wd != today_weekday || conf < threshold {
            continue;
        }
        let slot_start = slot * 15;
        if now_minutes >= slot_start {
            continue;
        }
        match best {
            None => best = Some((wd, slot, conf)),
            Some((_, _, best_conf)) if conf > best_conf => best = Some((wd, slot, conf)),
            _ => {}
        }
    }
    best
}

fn backfill_missing_tracked_apps(conn: &rusqlite::Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT DISTINCT s.app_path, s.app_name
            FROM app_sessions s
            LEFT JOIN tracked_apps t ON t.app_path = s.app_path
            WHERE t.app_path IS NULL
               OR t.icon_data_url IS NULL
               OR t.icon_data_url = ''
            "#,
        )
        .map_err(|e| format!("prepare backfill failed: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("query backfill failed: {e}"))?;

    let now = Local::now().to_rfc3339();
    for row in rows {
        let (path, name) = row.map_err(|e| format!("backfill row failed: {e}"))?;
        let icon = icon_data_url_for(std::path::Path::new(&path));
        crate::db::upsert_tracked_app(conn, &name, &path, icon.as_deref(), &now)?;
    }
    Ok(())
}

fn ensure_icon_for_path(
    conn: &rusqlite::Connection,
    path: &str,
    sessions: &[SessionRow],
) -> Option<String> {
    let icon = icon_data_url_for(std::path::Path::new(path))?;
    let name = sessions
        .first()
        .map(|s| s.app_name.as_str())
        .unwrap_or("App");
    let _ = crate::db::upsert_tracked_app(
        conn,
        name,
        path,
        Some(icon.as_str()),
        &Local::now().to_rfc3339(),
    );
    Some(icon)
}

fn frequency_scores(sessions: &[SessionRow]) -> HashMap<(i64, i64), f64> {
    let mut by_wd_slot: HashMap<(i64, i64), HashSet<NaiveDate>> = HashMap::new();
    let mut days_by_wd: HashMap<i64, HashSet<NaiveDate>> = HashMap::new();

    for session in sessions {
        for (day, wd, slot) in expand_positive_slots(session) {
            by_wd_slot.entry((wd, slot)).or_default().insert(day);
            days_by_wd.entry(wd).or_default().insert(day);
        }
    }

    let mut scores = HashMap::new();
    for ((wd, slot), days) in by_wd_slot {
        if days.len() < MIN_SLOT_OBSERVATIONS {
            continue;
        }
        let denom = days_by_wd.get(&wd).map(|d| d.len()).unwrap_or(1).max(1) as f64;
        scores.insert((wd, slot), days.len() as f64 / denom);
    }
    scores
}

fn expand_positive_slots(session: &SessionRow) -> Vec<(NaiveDate, i64, i64)> {
    let Some(start) = parse_local(&session.started_at) else {
        return Vec::new();
    };
    let mut end = session
        .ended_at
        .as_deref()
        .and_then(parse_local)
        .unwrap_or_else(|| start + chrono::Duration::minutes(15));
    if end < start {
        end = start;
    }

    let day_last = start
        .date_naive()
        .and_hms_opt(23, 45, 0)
        .and_then(|n| n.and_local_timezone(Local).single())
        .unwrap_or(start);
    if end.date_naive() > start.date_naive() || end > day_last {
        end = day_last;
    }

    let start_wd = session.weekday;
    let mut out = Vec::new();
    let mut cursor = floor_slot(start);
    let last = floor_slot(end);
    let mut guard = 0u32;
    while cursor <= last && guard < 96 {
        out.push((cursor.date_naive(), start_wd, slot_index(cursor)));
        cursor += chrono::Duration::minutes(15);
        guard += 1;
    }
    out
}

fn load_sessions(conn: &rusqlite::Connection) -> Result<Vec<SessionRow>, String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT app_name, app_path, started_at, ended_at, weekday
            FROM app_sessions
            ORDER BY started_at ASC
            "#,
        )
        .map_err(|e| format!("prepare sessions failed: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(SessionRow {
                app_name: row.get(0)?,
                app_path: row.get(1)?,
                started_at: row.get(2)?,
                ended_at: row.get(3)?,
                weekday: row.get(4)?,
            })
        })
        .map_err(|e| format!("query sessions failed: {e}"))?;

    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| format!("session row failed: {e}"))?);
    }
    Ok(out)
}

fn load_icons(conn: &rusqlite::Connection) -> Result<HashMap<String, AppMeta>, String> {
    let mut stmt = match conn.prepare(
        "SELECT app_path, app_name, icon_data_url FROM tracked_apps",
    ) {
        Ok(s) => s,
        Err(_) => return Ok(HashMap::new()),
    };

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                AppMeta {
                    app_name: row.get(1)?,
                    icon_data_url: row.get(2)?,
                },
            ))
        })
        .map_err(|e| format!("query tracked_apps failed: {e}"))?;

    let mut out = HashMap::new();
    for row in rows {
        let (path, meta) = row.map_err(|e| format!("tracked_apps row failed: {e}"))?;
        let key = path.replace('/', "\\").to_lowercase();
        out.insert(path.clone(), meta.clone());
        out.insert(key, meta);
    }
    Ok(out)
}

fn lookup_meta(icons: &HashMap<String, AppMeta>, path: &str) -> Option<AppMeta> {
    icons
        .get(path)
        .cloned()
        .or_else(|| icons.get(&path.replace('/', "\\").to_lowercase()).cloned())
}

fn display_name(name: Option<&str>, path: &str) -> String {
    let mut raw = name
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("")
        .to_string();
    if raw.is_empty() {
        raw = std::path::Path::new(path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("App")
            .to_string();
    }
    if raw.to_ascii_lowercase().ends_with(".exe") {
        raw.truncate(raw.len().saturating_sub(4));
    }
    raw
}

fn parse_local(value: &str) -> Option<DateTime<Local>> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|dt| dt.with_timezone(&Local))
}

fn floor_slot(dt: DateTime<Local>) -> DateTime<Local> {
    let minute = (dt.minute() / 15) * 15;
    dt.date_naive()
        .and_hms_opt(dt.hour(), minute, 0)
        .and_then(|n| n.and_local_timezone(Local).single())
        .unwrap_or(dt)
}

fn slot_index(dt: DateTime<Local>) -> i64 {
    let floored = floor_slot(dt);
    (floored.hour() * 4 + floored.minute() / 15) as i64
}

fn slot_to_range(slot: i64) -> (String, String) {
    let total = slot * 15;
    let hour = (total / 60) % 24;
    let minute = total % 60;
    let start = format!("{hour:02}:{minute:02}");
    let end_total = total + 15;
    let end_hour = (end_total / 60) % 24;
    let end_minute = end_total % 60;
    let end = format!("{end_hour:02}:{end_minute:02}");
    (start, end)
}
