use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use crate::apps::{looks_like_url, normalize_url};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchResult {
    pub path: String,
    pub ok: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub fn launch_application(path: String) -> Result<(), String> {
    launch_path(&path)
}

pub fn launch_path(path: &str) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Empty path".into());
    }

    if looks_like_url(trimmed) {
        let url = normalize_url(trimmed)?;
        return launch_url(&url);
    }

    let path = PathBuf::from(trimmed);
    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }
    if !path.is_file() {
        return Err("Expected an application file".into());
    }

    launch_path_platform(&path)
}

#[cfg(windows)]
fn launch_url(url: &str) -> Result<(), String> {
    const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
    let escaped = url.replace('"', "");
    let raw = format!("/C start \"\" \"{escaped}\"");

    Command::new("cmd")
        .raw_arg(raw)
        .creation_flags(CREATE_NEW_PROCESS_GROUP)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open website: {e}"))
}

#[cfg(not(windows))]
fn launch_url(url: &str) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(url)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open website: {e}"))
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
        .map_err(|e| format!("Failed to launch \"{}\": {e}", file_name(path)))
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
        .map_err(|e| format!("Failed to launch \"{}\": {e}", file_name(path)))
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("application")
        .to_string()
}
