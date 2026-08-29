use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};

use crate::context::{is_any_game_running, is_launch_blocked, is_on_battery};
use crate::launcher::{launch_path, LaunchResult};
use crate::schedule::storage::load_schedules_internal;
use crate::sequences::load_sequences_internal;

static BOOT_LAUNCHES_DONE: AtomicBool = AtomicBool::new(false);
static LAUNCHED_BOOT_IDS: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();

const AUTOSTART_ARG: &str = "--autostart";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BootLaunchTarget {
    pub id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootLaunchResponse {
    pub results: Vec<LaunchResult>,
    pub blocked: usize,
}

#[tauri::command]
pub fn is_autostart_session() -> bool {
    std::env::args().any(|arg| arg == AUTOSTART_ARG)
}

#[tauri::command]
pub fn run_boot_launches(
    app: tauri::AppHandle,
    targets: Vec<BootLaunchTarget>,
) -> Result<BootLaunchResponse, String> {
    if !is_autostart_session() {
        return Ok(BootLaunchResponse {
            results: vec![],
            blocked: 0,
        });
    }

    if BOOT_LAUNCHES_DONE.load(Ordering::SeqCst) {
        return Ok(BootLaunchResponse {
            results: vec![],
            blocked: 0,
        });
    }

    if BOOT_LAUNCHES_DONE
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Ok(BootLaunchResponse {
            results: vec![],
            blocked: 0,
        });
    }

    let launched_ids = LAUNCHED_BOOT_IDS.get_or_init(|| Mutex::new(HashSet::new()));
    let schedules = load_schedules_internal(&app)?;
    let sequences = load_sequences_internal(&app)?;
    let on_battery = is_on_battery();
    let game_active = is_any_game_running(&schedules, &sequences);

    let mut results = Vec::new();
    let mut skipped_blocked = 0usize;
    let mut still_pending = false;

    for target in targets {
        {
            let launched = launched_ids.lock().expect("boot launch ids lock");
            if launched.contains(&target.id) {
                continue;
            }
        }

        let Some(schedule) = schedules.iter().find(|item| item.id == target.id) else {
            continue;
        };

        if is_launch_blocked(&schedules, schedule, on_battery, game_active) {
            skipped_blocked += 1;
            still_pending = true;
            continue;
        }

        match launch_path(&schedule.app_path) {
            Ok(()) => {
                launched_ids
                    .lock()
                    .expect("boot launch ids lock")
                    .insert(target.id.clone());
                results.push(LaunchResult {
                    path: schedule.app_path.clone(),
                    ok: true,
                    error: None,
                });
            }
            Err(error) => {
                eprintln!("[OnCue] boot launch failed for {}: {error}", target.id);
                results.push(LaunchResult {
                    path: schedule.app_path.clone(),
                    ok: false,
                    error: Some(error),
                });
            }
        }
    }

    BOOT_LAUNCHES_DONE.store(!still_pending, Ordering::SeqCst);

    Ok(BootLaunchResponse {
        results,
        blocked: skipped_blocked,
    })
}

pub fn autostart_arg() -> &'static str {
    AUTOSTART_ARG
}
