use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::Duration;

use base64::Engine;
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppTargetInfo {
    pub path: String,
    pub name: String,
    pub icon_data_url: Option<String>,
}

const ALLOWED_EXTENSIONS: &[&str] = &["exe", "bat", "cmd", "com", "lnk"];

#[tauri::command]
pub fn resolve_app_target(
    path: String,
    fetch_icon: Option<bool>,
) -> Result<AppTargetInfo, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Provide a path to an application or a website URL".into());
    }

    let want_icon = fetch_icon.unwrap_or(false);

    if looks_like_url(trimmed) {
        let url = normalize_url(trimmed)?;
        let icon_data_url = if want_icon {
            fetch_favicon_data_url(&url)
        } else {
            None
        };
        return Ok(AppTargetInfo {
            name: url_display_name(&url),
            path: url,
            icon_data_url,
        });
    }

    let path = PathBuf::from(trimmed);

    if !path.exists() {
        return Err("File not found at this path".into());
    }
    if !path.is_file() {
        return Err("Expected an application file, not a folder".into());
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(format!(
            "Unsupported type \".{ext}\". Allowed: .exe, .bat, .cmd, .com, .lnk, or https://…"
        ));
    }

    let name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .filter(|s| !s.is_empty())
        .unwrap_or("Application")
        .to_string();

    let icon_data_url = extract_icon(&path);

    Ok(AppTargetInfo {
        path: path.to_string_lossy().into_owned(),
        name,
        icon_data_url,
    })
}

pub fn icon_data_url_for(path: &Path) -> Option<String> {
    extract_icon(path)
}

pub fn looks_like_url(value: &str) -> bool {
    let lower = value.trim().to_ascii_lowercase();
    lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("www.")
}

pub fn normalize_url(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    let with_scheme = if trimmed.to_ascii_lowercase().starts_with("www.") {
        format!("https://{trimmed}")
    } else {
        trimmed.to_string()
    };

    let lower = with_scheme.to_ascii_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return Err("Website must start with http://, https://, or www.".into());
    }
    if with_scheme.contains(' ') {
        return Err("URL must not contain spaces".into());
    }
    Ok(with_scheme)
}

fn url_display_name(url: &str) -> String {
    match url_host(url) {
        Some(host) => host,
        None => "Website".into(),
    }
}

fn url_host(url: &str) -> Option<String> {
    let without_scheme = url
        .trim()
        .trim_start_matches("https://")
        .trim_start_matches("http://")
        .trim_start_matches("HTTPS://")
        .trim_start_matches("HTTP://");
    let host = without_scheme
        .split('/')
        .next()?
        .split('?')
        .next()?
        .trim_start_matches("www.");
    if host.is_empty() {
        None
    } else {
        Some(host.to_string())
    }
}

fn fetch_favicon_data_url(page_url: &str) -> Option<String> {
    let host = url_host(page_url)?;
    // One fast source only — never block the UI with a chain of slow fallbacks.
    let icon_url = format!("https://www.google.com/s2/favicons?domain={host}&sz=64");
    download_as_data_url(&icon_url)
}

fn download_as_data_url(url: &str) -> Option<String> {
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_millis(1200))
        .timeout_read(Duration::from_millis(1500))
        .build();

    let response = agent.get(url).call().ok()?;
    let content_type = response.content_type().to_string();

    let mut bytes = Vec::new();
    response
        .into_reader()
        .take(128 * 1024)
        .read_to_end(&mut bytes)
        .ok()?;
    if bytes.len() < 16 {
        return None;
    }

    let mime = if content_type.starts_with("image/") {
        content_type
    } else if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        "image/png".into()
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "image/jpeg".into()
    } else {
        "image/png".into()
    };

    let b64 = base64::engine::general_purpose::STANDARD.encode(bytes);
    Some(format!("data:{mime};base64,{b64}"))
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
