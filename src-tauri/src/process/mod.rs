mod filter;
mod sampler;

pub use sampler::{sample_once, start};

use std::collections::HashSet;

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

pub fn matching_pids(app_path: &str) -> HashSet<u32> {
    let trimmed = app_path.trim();
    if trimmed.is_empty() || crate::apps::looks_like_url(trimmed) {
        return HashSet::new();
    }

    let target = normalize_path(trimmed);
    let target_file = executable_file_name(trimmed);
    let target_stem = target_file
        .as_ref()
        .and_then(|name| name.strip_suffix(".exe").map(str::to_string));

    let mut system = System::new();
    system.refresh_processes(ProcessesToUpdate::All, true);

    system
        .processes()
        .iter()
        .filter_map(|(pid, process)| {
            let matches = if let Some(exe) = process.exe().map(|p| p.to_string_lossy().into_owned()) {
                if exe.is_empty() {
                    false
                } else {
                    let running = normalize_path(&exe);
                    if running == target {
                        true
                    } else if let Some(ref name) = target_file {
                        running.ends_with(&format!("\\{name}"))
                    } else {
                        false
                    }
                }
            } else {
                let proc_name = process.name().to_string_lossy().to_lowercase();
                if let Some(ref name) = target_file {
                    if proc_name == *name {
                        return Some(pid.as_u32());
                    }
                }
                if let Some(ref stem) = target_stem {
                    proc_name == *stem || proc_name == format!("{stem}.exe")
                } else {
                    false
                }
            };

            if matches { Some(pid.as_u32()) } else { None }
        })
        .collect()
}

pub fn is_app_running(app_path: &str) -> bool {
    !matching_pids(app_path).is_empty()
}

fn executable_file_name(path: &str) -> Option<String> {
    let name = std::path::Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.to_lowercase())?;

    // Shortcuts are matched by the usual exe name (Steam.lnk → steam.exe).
    if let Some(stem) = name.strip_suffix(".lnk") {
        return Some(format!("{stem}.exe"));
    }

    Some(name)
}

pub(crate) fn normalize_path(path: &str) -> String {
    path.replace('/', "\\").to_lowercase()
}
