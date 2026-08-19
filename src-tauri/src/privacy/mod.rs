use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConsentFile {
    accepted: bool,
    #[serde(default)]
    accepted_at: Option<String>,
}

fn consent_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not resolve app data dir: {e}"))?
        .join("storage");
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create storage dir: {e}"))?;
    Ok(dir.join("privacy_consent.json"))
}

pub fn has_consent(app: &AppHandle) -> bool {
    let Ok(path) = consent_path(app) else {
        return false;
    };
    let Ok(raw) = fs::read_to_string(path) else {
        return false;
    };
    serde_json::from_str::<ConsentFile>(&raw)
        .map(|c| c.accepted)
        .unwrap_or(false)
}

#[tauri::command]
pub fn get_privacy_consent(app: AppHandle) -> bool {
    has_consent(&app)
}

#[tauri::command]
pub fn accept_privacy_consent(app: AppHandle) -> Result<(), String> {
    let path = consent_path(&app)?;
    let payload = ConsentFile {
        accepted: true,
        accepted_at: Some(chrono::Local::now().to_rfc3339()),
    };
    let json = serde_json::to_string_pretty(&payload)
        .map_err(|e| format!("Could not serialize consent: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Could not save consent: {e}"))?;
    crate::process::sample_once(&app);
    Ok(())
}

#[tauri::command]
pub fn app_quit(app: AppHandle) {
    app.exit(0);
}
