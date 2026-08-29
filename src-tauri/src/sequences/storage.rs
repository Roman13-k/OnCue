use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredSequenceStep {
    pub id: String,
    pub app_name: String,
    pub app_path: String,
    pub icon_data_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredSequence {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub trigger_name: String,
    pub trigger_path: String,
    pub trigger_icon_data_url: Option<String>,
    #[serde(default)]
    pub skip_on_battery: bool,
    #[serde(default)]
    pub is_game: bool,
    pub steps: Vec<StoredSequenceStep>,
    #[serde(default = "default_cooldown_sec")]
    pub cooldown_sec: u32,
    pub created_at: String,
    pub updated_at: String,
}

fn default_cooldown_sec() -> u32 {
    60
}

const STORAGE_DIR: &str = "storage";
const STORAGE_FILE: &str = "sequences.json";

#[tauri::command]
pub fn load_sequences(app: AppHandle) -> Result<Vec<StoredSequence>, String> {
    load_sequences_internal(&app)
}

#[tauri::command]
pub fn save_sequences(app: AppHandle, sequences: Vec<StoredSequence>) -> Result<(), String> {
    save_sequences_internal(&app, &sequences)
}

pub fn load_sequences_internal(app: &AppHandle) -> Result<Vec<StoredSequence>, String> {
    let path = sequences_file_path(app)?;
    if !path.exists() {
        return Ok(vec![]);
    }

    let raw =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read sequences: {e}"))?;

    if raw.trim().is_empty() {
        return Ok(vec![]);
    }

    serde_json::from_str::<Vec<StoredSequence>>(&raw)
        .map_err(|e| format!("Failed to parse sequences: {e}"))
}

pub fn save_sequences_internal(
    app: &AppHandle,
    sequences: &[StoredSequence],
) -> Result<(), String> {
    let path = sequences_file_path(app)?;
    let dir = path
        .parent()
        .ok_or_else(|| "Failed to resolve sequences storage folder".to_string())?;

    fs::create_dir_all(dir)
        .map_err(|e| format!("Failed to create sequences storage folder: {e}"))?;

    let json = serde_json::to_string_pretty(sequences)
        .map_err(|e| format!("Failed to serialize sequences: {e}"))?;

    fs::write(&path, json).map_err(|e| format!("Failed to save sequences: {e}"))
}

fn sequences_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data folder: {e}"))?;

    Ok(app_data_dir.join(STORAGE_DIR).join(STORAGE_FILE))
}
