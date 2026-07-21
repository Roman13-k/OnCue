use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchResult {
    pub path: String,
    pub ok: bool,
    pub error: Option<String>,
}

/// Start an application detached from OnCue's process.
#[tauri::command]
pub fn launch_application(path: String) -> Result<(), String> {
    launch_path(&path)
}

pub fn launch_path(path: &str) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Пустой путь".into());
    }

    let path = PathBuf::from(trimmed);
    if !path.exists() {
        return Err(format!("Файл не найден: {}", path.display()));
    }
    if !path.is_file() {
        return Err("Ожидался файл приложения".into());
    }

    launch_path_platform(&path)
}

#[cfg(windows)]
fn launch_path_platform(path: &Path) -> Result<(), String> {
    let mut cmd = Command::new("cmd");
    if let Some(dir) = path.parent().filter(|p| p.exists()) {
        cmd.current_dir(dir);
    }

    let escaped = path.display().to_string().replace('"', "\"\"");
    let raw = format!("/C start \"\" /min \"{escaped}\"");

    const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;

    cmd.raw_arg(raw);
    cmd.creation_flags(CREATE_NEW_PROCESS_GROUP);
    cmd.stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null());

    cmd.spawn()
        .map(|_| ())
        .map_err(|e| format!("Не удалось запустить «{}»: {e}", file_name(path)))
}

#[cfg(not(windows))]
fn launch_path_platform(path: &Path) -> Result<(), String> {
    let mut cmd = Command::new(path);
    if let Some(dir) = path.parent().filter(|p| p.exists()) {
        cmd.current_dir(dir);
    }

    cmd.stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null());

    cmd.spawn()
        .map(|_| ())
        .map_err(|e| format!("Не удалось запустить «{}»: {e}", file_name(path)))
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("приложение")
        .to_string()
}
