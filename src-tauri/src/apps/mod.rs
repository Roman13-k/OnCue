use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppTargetInfo {
    pub path: String,
    pub name: String,
    pub icon_data_url: Option<String>,
}

const ALLOWED_EXTENSIONS: &[&str] = &["exe", "bat", "cmd", "com", "lnk"];

#[tauri::command]
pub fn resolve_app_target(path: String) -> Result<AppTargetInfo, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Укажите путь к приложению".into());
    }

    let path = PathBuf::from(trimmed);

    if !path.exists() {
        return Err("Файл не найден по этому пути".into());
    }
    if !path.is_file() {
        return Err("Нужен файл приложения, а не папка".into());
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(format!(
            "Неподдерживаемый тип «.{ext}». Допустимы: .exe, .bat, .cmd, .com, .lnk"
        ));
    }

    let name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .filter(|s| !s.is_empty())
        .unwrap_or("Приложение")
        .to_string();

    let icon_data_url = extract_icon(&path);

    Ok(AppTargetInfo {
        path: path.to_string_lossy().into_owned(),
        name,
        icon_data_url,
    })
}

#[cfg(windows)]
fn extract_icon(path: &Path) -> Option<String> {
    let path_str = path.to_string_lossy();
    match windows_icons::get_icon_base64_by_path(path_str.as_ref()) {
        Ok(b64) if !b64.is_empty() => {
            if b64.starts_with("data:") {
                Some(b64)
            } else {
                Some(format!("data:image/png;base64,{b64}"))
            }
        }
        _ => None,
    }
}

#[cfg(not(windows))]
fn extract_icon(_path: &Path) -> Option<String> {
    None
}
