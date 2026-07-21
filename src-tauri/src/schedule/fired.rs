use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

const STORAGE_DIR: &str = "storage";
const STORAGE_FILE: &str = "fired-occurrences.json";
const RETENTION_MS: u64 = 14 * 24 * 60 * 60 * 1000;

#[derive(Debug, Default, Serialize, Deserialize)]
struct FiredStore {
    keys: HashMap<String, u64>,
}

fn storage_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Не удалось получить папку данных приложения: {e}"))?;

    Ok(app_data_dir.join(STORAGE_DIR).join(STORAGE_FILE))
}

fn read_store(path: &Path) -> FiredStore {
    if !path.exists() {
        return FiredStore::default();
    }

    let raw = match fs::read_to_string(path) {
        Ok(value) => value,
        Err(_) => return FiredStore::default(),
    };

    serde_json::from_str(&raw).unwrap_or_default()
}

fn write_store(path: &Path, store: &FiredStore) -> Result<(), String> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)
            .map_err(|e| format!("Не удалось создать папку хранения fired keys: {e}"))?;
    }

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let cutoff = now_ms.saturating_sub(RETENTION_MS);

    let keys = store
        .keys
        .iter()
        .filter(|(_, ts)| **ts >= cutoff)
        .map(|(key, ts)| (key.clone(), *ts))
        .collect();

    let pruned = FiredStore { keys };
    let json = serde_json::to_string_pretty(&pruned)
        .map_err(|e| format!("Не удалось сериализовать fired keys: {e}"))?;

    fs::write(path, json).map_err(|e| format!("Не удалось сохранить fired keys: {e}"))
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn is_occurrence_fired(app: &AppHandle, occurrence_key: &str) -> Result<bool, String> {
    let path = storage_path(app)?;
    let store = read_store(&path);
    Ok(store.keys.contains_key(occurrence_key))
}

pub fn mark_occurrence_fired(app: &AppHandle, occurrence_key: &str) -> Result<(), String> {
    let path = storage_path(app)?;
    let mut store = read_store(&path);
    store.keys.insert(occurrence_key.to_string(), now_ms());
    write_store(&path, &store)
}
