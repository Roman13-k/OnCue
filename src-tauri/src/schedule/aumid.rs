//! Register an unpackaged AppUserModelID so WinRT toasts show as OnCue, not PowerShell.

use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;

use tauri::{AppHandle, Manager};

/// Must match `identifier` in tauri.conf.json.
pub const AUMID: &str = "com.oncue.app";
const DISPLAY_NAME: &str = "OnCue";

static TOAST_ICON_PATH: OnceLock<PathBuf> = OnceLock::new();

/// Write the app icon into app data and register HKCU AUMID (DisplayName + IconUri).
/// Safe to call every launch; idempotent.
pub fn ensure_registered(app: &AppHandle) -> Result<(), String> {
    let icon_path = ensure_toast_icon(app)?;
    register_aumid(&icon_path)?;
    let _ = TOAST_ICON_PATH.set(icon_path);
    Ok(())
}

pub fn toast_icon_path() -> Option<&'static PathBuf> {
    TOAST_ICON_PATH.get()
}

fn ensure_toast_icon(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Не удалось получить папку данных: {e}"))?
        .join("toast");

    fs::create_dir_all(&dir).map_err(|e| format!("Не удалось создать папку toast: {e}"))?;

    let icon_path = dir.join("icon.png");
    // Refresh each launch so icon updates from the binary always apply.
    fs::write(&icon_path, include_bytes!("../../icons/icon.png"))
        .map_err(|e| format!("Не удалось сохранить иконку уведомлений: {e}"))?;

    // Absolute path without `\\?\` — required by WinRT toast IconUri / icon().
    let absolute = icon_path
        .canonicalize()
        .unwrap_or(icon_path);
    Ok(PathBuf::from(
        absolute.to_string_lossy().replacen(r"\\?\", "", 1),
    ))
}

fn register_aumid(icon_path: &std::path::Path) -> Result<(), String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (key, _) = hkcu
        .create_subkey(format!(r"Software\Classes\AppUserModelId\{AUMID}"))
        .map_err(|e| format!("Не удалось зарегистрировать AUMID: {e}"))?;

    key.set_value("DisplayName", &DISPLAY_NAME)
        .map_err(|e| format!("Не удалось задать DisplayName: {e}"))?;
    key.set_value("IconBackgroundColor", &"0")
        .map_err(|e| format!("Не удалось задать IconBackgroundColor: {e}"))?;

    let icon_uri = icon_path.to_string_lossy().to_string();
    key.set_value("IconUri", &icon_uri)
        .map_err(|e| format!("Не удалось задать IconUri: {e}"))?;

    Ok(())
}
