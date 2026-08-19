mod filter;
mod sampler;

pub use sampler::{sample_once, start};

use sysinfo::{ProcessesToUpdate, System};

#[derive(Debug, Clone)]
pub struct ProcessInfo {
    pub name: String,

    pub exe_path: Option<String>,
}

pub fn list_processes() -> Vec<ProcessInfo> {
    let mut system = System::new();
    system.refresh_processes(ProcessesToUpdate::All, true);

    system
        .processes()
        .values()
        .map(|process| ProcessInfo {
            name: process.name().to_string_lossy().into_owned(),
            exe_path: process.exe().map(|p| p.to_string_lossy().into_owned()),
        })
        .collect()
}

pub fn list_user_apps() -> Vec<ProcessInfo> {
    filter::unique_user_apps(list_processes())
}

#[allow(dead_code)]
pub fn find_processes(needle: &str) -> Vec<ProcessInfo> {
    let needle = needle.to_lowercase();
    list_processes()
        .into_iter()
        .filter(|p| {
            p.name.to_lowercase().contains(&needle)
                || p.exe_path
                    .as_ref()
                    .map(|path| path.to_lowercase().contains(&needle))
                    .unwrap_or(false)
        })
        .collect()
}

pub fn is_app_running(app_path: &str) -> bool {
    let trimmed = app_path.trim();
    if trimmed.is_empty() {
        return false;
    }

    if crate::apps::looks_like_url(trimmed) {
        return false;
    }

    let target = normalize_path(trimmed);
    let target_file = executable_file_name(trimmed);
    let target_stem = target_file
        .as_ref()
        .and_then(|name| name.strip_suffix(".exe").map(str::to_string));

    list_processes().into_iter().any(|process| {
        if let Some(exe) = process.exe_path.as_deref().filter(|path| !path.is_empty()) {
            let running = normalize_path(exe);
            if running == target {
                return true;
            }
            if let Some(ref name) = target_file {
                if running.ends_with(&format!("\\{name}")) {
                    return true;
                }
            }
            return false;
        }

        let proc_name = process.name.to_lowercase();
        if let Some(ref name) = target_file {
            if proc_name == *name {
                return true;
            }
        }
        if let Some(ref stem) = target_stem {
            if proc_name == *stem || proc_name == format!("{stem}.exe") {
                return true;
            }
        }

        false
    })
}

fn executable_file_name(path: &str) -> Option<String> {
    std::path::Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.to_lowercase())
}

pub(crate) fn normalize_path(path: &str) -> String {
    path.replace('/', "\\").to_lowercase()
}
