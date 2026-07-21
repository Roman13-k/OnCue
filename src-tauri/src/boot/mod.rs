use serde::Deserialize;
use std::sync::atomic::{AtomicBool, Ordering};

use crate::launcher::{launch_path, LaunchResult};

static BOOT_LAUNCHES_DONE: AtomicBool = AtomicBool::new(false);

const AUTOSTART_ARG: &str = "--autostart";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BootLaunchTarget {
    pub id: String,
    pub path: String,
}

#[tauri::command]
pub fn is_autostart_session() -> bool {
    std::env::args().any(|arg| arg == AUTOSTART_ARG)
}

/// Launch all boot-mode targets once per process when started via OS autostart.
#[tauri::command]
pub fn run_boot_launches(targets: Vec<BootLaunchTarget>) -> Result<Vec<LaunchResult>, String> {
    if !is_autostart_session() {
        return Ok(vec![]);
    }

    // React StrictMode / remounts must not spawn twice.
    if BOOT_LAUNCHES_DONE.swap(true, Ordering::SeqCst) {
        return Ok(vec![]);
    }

    let mut results = Vec::with_capacity(targets.len());
    for target in targets {
        match launch_path(&target.path) {
            Ok(()) => results.push(LaunchResult {
                path: target.path,
                ok: true,
                error: None,
            }),
            Err(error) => {
                eprintln!("[OnCue] boot launch failed for {}: {error}", target.id);
                results.push(LaunchResult {
                    path: target.path,
                    ok: false,
                    error: Some(error),
                });
            }
        }
    }

    Ok(results)
}

pub fn autostart_arg() -> &'static str {
    AUTOSTART_ARG
}
