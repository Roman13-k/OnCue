use std::fs;
use std::path::PathBuf;

use chrono::{Datelike, Local, Timelike};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use super::HabitSuggestion;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredSuggestionAutostart {
    pub id: String,
    pub app_name: String,
    pub app_path: String,
    pub icon_data_url: Option<String>,
    pub weekday: i64,
    pub time_from: String,
    pub time_to: String,
    pub enabled: bool,
}

const STORAGE_DIR: &str = "storage";
const STORAGE_FILE: &str = "suggestion-autostarts.json";
const MIN_OBSERVATIONS: usize = 2;

pub fn suggestion_id(app_path: &str, weekday: i64, time_from: &str) -> String {
    format!("{}|{}|{}", app_path, weekday, time_from)
}

pub fn load_autostarts_internal(app: &AppHandle) -> Result<Vec<StoredSuggestionAutostart>, String> {
    let path = autostarts_file_path(app)?;
    if !path.exists() {
        return Ok(vec![]);
    }

    let raw =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read suggestion autostarts: {e}"))?;

    if raw.trim().is_empty() {
        return Ok(vec![]);
    }

    serde_json::from_str::<Vec<StoredSuggestionAutostart>>(&raw)
        .map_err(|e| format!("Failed to parse suggestion autostarts: {e}"))
}

pub fn save_autostarts_internal(
    app: &AppHandle,
    items: &[StoredSuggestionAutostart],
) -> Result<(), String> {
    let path = autostarts_file_path(app)?;
    let dir = path
        .parent()
        .ok_or_else(|| "Failed to resolve suggestion autostarts storage folder".to_string())?;

    fs::create_dir_all(dir)
        .map_err(|e| format!("Failed to create suggestion autostarts storage folder: {e}"))?;

    let json = serde_json::to_string_pretty(items)
        .map_err(|e| format!("Failed to serialize suggestion autostarts: {e}"))?;

    fs::write(&path, json).map_err(|e| format!("Failed to save suggestion autostarts: {e}"))
}

pub fn is_autostart_enabled(
    autostarts: &[StoredSuggestionAutostart],
    app_path: &str,
    weekday: i64,
    time_from: &str,
) -> bool {
    let id = suggestion_id(app_path, weekday, time_from);
    autostarts
        .iter()
        .any(|item| item.id == id && item.enabled)
}

#[tauri::command]
pub fn load_suggestion_autostarts(
    app: AppHandle,
) -> Result<Vec<StoredSuggestionAutostart>, String> {
    load_autostarts_internal(&app)
}

#[tauri::command]
pub fn set_suggestion_autostart(
    app: AppHandle,
    item: HabitSuggestion,
    enabled: bool,
) -> Result<Vec<StoredSuggestionAutostart>, String> {
    let mut items = load_autostarts_internal(&app)?;
    let id = suggestion_id(&item.app_path, item.weekday, &item.from);

    if enabled {
        let entry = StoredSuggestionAutostart {
            id: id.clone(),
            app_name: item.app,
            app_path: item.app_path,
            icon_data_url: item.icon_data_url,
            weekday: item.weekday,
            time_from: item.from,
            time_to: item.to,
            enabled: true,
        };
        if let Some(existing) = items.iter_mut().find(|row| row.id == id) {
            *existing = entry;
        } else {
            items.push(entry);
        }
    } else {
        items.retain(|row| row.id != id);
    }

    save_autostarts_internal(&app, &items)?;
    Ok(items)
}

pub fn suggestion_occurrence_key_for(
    id: &str,
    date: chrono::NaiveDate,
    time_from: &str,
    time_to: &str,
) -> String {
    format!(
        "suggestion|{id}|{}|{time_from}|{time_to}",
        date.format("%Y-%m-%d")
    )
}

pub fn resolve_suggestion_occurrence_key(
    now: chrono::DateTime<Local>,
    item: &StoredSuggestionAutostart,
) -> Option<String> {
    if now.weekday().num_days_from_monday() as i64 != item.weekday {
        return None;
    }

    let from_min = parse_time_to_minutes(&item.time_from);
    let to_min = parse_time_to_minutes(&item.time_to);
    let now_min = now.hour() * 60 + now.minute();
    let today = now.date_naive();

    if from_min == to_min {
        if now_min != from_min {
            return None;
        }
        return Some(suggestion_occurrence_key_for(
            &item.id,
            today,
            &item.time_from,
            &item.time_to,
        ));
    }

    if from_min < to_min {
        if now_min < from_min || now_min > to_min {
            return None;
        }
        return Some(suggestion_occurrence_key_for(
            &item.id,
            today,
            &item.time_from,
            &item.time_to,
        ));
    }

    if now_min >= from_min {
        return Some(suggestion_occurrence_key_for(
            &item.id,
            today,
            &item.time_from,
            &item.time_to,
        ));
    }

    if now_min <= to_min {
        let yesterday = today.pred_opt().unwrap_or(today);
        return Some(suggestion_occurrence_key_for(
            &item.id,
            yesterday,
            &item.time_from,
            &item.time_to,
        ));
    }

    None
}

fn parse_time_to_minutes(time: &str) -> u32 {
    let mut parts = time.split(':');
    let hours = parts
        .next()
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(0)
        .min(23);
    let minutes = parts
        .next()
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(0)
        .min(59);
    hours * 60 + minutes
}

fn autostarts_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data folder: {e}"))?;

    Ok(app_data_dir.join(STORAGE_DIR).join(STORAGE_FILE))
}

pub const MIN_SLOT_OBSERVATIONS: usize = MIN_OBSERVATIONS;
