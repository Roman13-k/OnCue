use std::thread;
use std::time::Duration;

use tauri::AppHandle;

use crate::context::{is_any_game_running, is_on_battery, is_sequence_blocked};
use crate::launcher::{launch_path, LaunchResult};
use crate::process::is_app_running;
use crate::schedule::storage::load_schedules_internal;

use super::storage::{load_sequences_internal, StoredSequence};

const COMPANION_STEP_DELAY_MS: u64 = 200;

fn launch_if_needed(path: &str, results: &mut Vec<LaunchResult>) {
    if path.trim().is_empty() || is_app_running(path) {
        return;
    }

    match launch_path(path) {
        Ok(()) => results.push(LaunchResult {
            path: path.to_string(),
            ok: true,
            error: None,
        }),
        Err(error) => {
            eprintln!("[OnCue] sequence launch failed for {path}: {error}");
            results.push(LaunchResult {
                path: path.to_string(),
                ok: false,
                error: Some(error),
            });
        }
    }
}

fn run_companions(app: &AppHandle, sequence: &StoredSequence) -> Result<Vec<LaunchResult>, String> {
    let schedules = load_schedules_internal(app)?;
    let sequences = load_sequences_internal(app)?;
    let on_battery = is_on_battery();
    let game_active = is_any_game_running(&schedules, &sequences);

    if is_sequence_blocked(sequence, on_battery, game_active) {
        return Ok(vec![]);
    }

    let mut results = Vec::new();

    for step in &sequence.steps {
        thread::sleep(Duration::from_millis(COMPANION_STEP_DELAY_MS));
        launch_if_needed(&step.app_path, &mut results);
    }

    Ok(results)
}

pub fn run_sequence_companions(app: &AppHandle, sequence_id: &str) -> Result<Vec<LaunchResult>, String> {
    let sequences = load_sequences_internal(app)?;
    let sequence = sequences
        .iter()
        .find(|item| item.id == sequence_id)
        .ok_or_else(|| format!("Sequence not found: {sequence_id}"))?
        .clone();

    if !sequence.enabled {
        return Ok(vec![]);
    }

    run_companions(app, &sequence)
}

pub fn spawn_sequence_companions(app: AppHandle, sequence_id: String) {
    thread::spawn(move || {
        if let Err(error) = run_sequence_companions(&app, &sequence_id) {
            eprintln!("[OnCue] sequence companions failed for {sequence_id}: {error}");
        }
    });
}

#[tauri::command]
pub fn run_sequence_now(app: AppHandle, sequence_id: String) -> Result<Vec<LaunchResult>, String> {
    run_sequence_companions(&app, &sequence_id)
}
