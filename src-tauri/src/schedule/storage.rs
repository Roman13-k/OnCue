use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredSchedule {
    pub id: String,
    pub app_name: String,
    pub app_path: String,
    pub icon_data_url: Option<String>,
    pub day_ids: Vec<String>,
    pub time_from: String,
    pub time_to: String,
    pub mode: String,
    pub notify: String,
    #[serde(default)]
    pub skip_on_battery: bool,
    #[serde(default)]
    pub is_game: bool,
    #[serde(default = "default_target_kind")]
    pub target_kind: String,
    #[serde(default)]
    pub sequence_id: Option<String>,
    pub enabled: bool,
    pub health: String,
    pub error_message: Option<String>,
    pub created_at: String,
    pub     updated_at: String,
}

fn default_target_kind() -> String {
    "app".to_string()
}

const STORAGE_DIR: &str = "storage";
const STORAGE_FILE: &str = "schedules.json";

#[tauri::command]
pub fn load_schedules(app: AppHandle) -> Result<Vec<StoredSchedule>, String> {
    load_schedules_internal(&app)
}

#[tauri::command]
pub fn save_schedules(app: AppHandle, schedules: Vec<StoredSchedule>) -> Result<(), String> {
    save_schedules_internal(&app, &schedules)
}

pub fn load_schedules_internal(app: &AppHandle) -> Result<Vec<StoredSchedule>, String> {
    let path = schedules_file_path(&app)?;
    if !path.exists() {
        return Ok(vec![]);
    }

    let raw =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read schedules: {e}"))?;

    if raw.trim().is_empty() {
        return Ok(vec![]);
    }

    serde_json::from_str::<Vec<StoredSchedule>>(&raw)
        .map_err(|e| format!("Failed to parse schedules: {e}"))
}

pub fn save_schedules_internal(
    app: &AppHandle,
    schedules: &[StoredSchedule],
) -> Result<(), String> {
    let path = schedules_file_path(app)?;
    let dir = path
        .parent()
        .ok_or_else(|| "Failed to resolve schedules storage folder".to_string())?;

    fs::create_dir_all(dir)
        .map_err(|e| format!("Failed to create schedules storage folder: {e}"))?;

    let json = serde_json::to_string_pretty(schedules)
        .map_err(|e| format!("Failed to serialize schedules: {e}"))?;

    fs::write(&path, json).map_err(|e| format!("Failed to save schedules: {e}"))
}

fn schedules_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data folder: {e}"))?;

    Ok(app_data_dir.join(STORAGE_DIR).join(STORAGE_FILE))
}
