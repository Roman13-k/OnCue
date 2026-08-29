use std::collections::{HashMap, HashSet};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};

use tauri::AppHandle;

use crate::context::{is_any_game_running, is_on_battery, is_sequence_blocked};
use crate::process::matching_pids;
use crate::schedule::storage::load_schedules_internal;

use super::runner::spawn_sequence_companions;
use super::storage::load_sequences_internal;

const POLL_SECS: u64 = 4;

struct WatcherState {
    /// Baseline PIDs per sequence after the first poll (avoids firing for apps already open at startup).
    seen_trigger_pids: HashMap<String, HashSet<u32>>,
    primed: HashSet<String>,
    last_fired_at: HashMap<String, Instant>,
}

static WATCHER_STATE: OnceLock<Mutex<WatcherState>> = OnceLock::new();

pub fn start(app: AppHandle) {
    thread::spawn(move || {
        let state = WATCHER_STATE.get_or_init(|| {
            Mutex::new(WatcherState {
                seen_trigger_pids: HashMap::new(),
                primed: HashSet::new(),
                last_fired_at: HashMap::new(),
            })
        });

        loop {
            if let Err(error) = tick(&app, state) {
                eprintln!("[OnCue] sequence watcher error: {error}");
            }
            thread::sleep(Duration::from_secs(POLL_SECS));
        }
    });
}

fn tick(app: &AppHandle, state: &Mutex<WatcherState>) -> Result<(), String> {
    let sequences = load_sequences_internal(app)?;
    let schedules = load_schedules_internal(app)?;
    let on_battery = is_on_battery();
    let game_active = is_any_game_running(&schedules, &sequences);
    let now = Instant::now();

    let mut guard = state
        .lock()
        .map_err(|_| "sequence watcher state lock poisoned".to_string())?;

    let active_ids: HashSet<String> = sequences.iter().map(|item| item.id.clone()).collect();
    guard
        .seen_trigger_pids
        .retain(|id, _| active_ids.contains(id));
    guard.primed.retain(|id| active_ids.contains(id));
    guard.last_fired_at.retain(|id, _| active_ids.contains(id));

    for sequence in sequences.iter().filter(|item| item.enabled) {
        if is_sequence_blocked(sequence, on_battery, game_active) {
            continue;
        }

        let current_pids = matching_pids(&sequence.trigger_path);
        let sequence_id = sequence.id.clone();

        if !guard.primed.contains(&sequence_id) {
            guard
                .seen_trigger_pids
                .insert(sequence_id.clone(), current_pids);
            guard.primed.insert(sequence_id);
            continue;
        }

        let entry = guard
            .seen_trigger_pids
            .entry(sequence_id.clone())
            .or_default();

        let has_new_pid = current_pids.iter().any(|pid| !entry.contains(pid));
        *entry = current_pids;

        if !has_new_pid {
            continue;
        }

        if let Some(last_fired) = guard.last_fired_at.get(&sequence.id) {
            if now.duration_since(*last_fired) < Duration::from_secs(sequence.cooldown_sec as u64) {
                continue;
            }
        }

        eprintln!(
            "[OnCue] sequence watcher: trigger started for \"{}\" — launching companions",
            sequence.name
        );

        guard.last_fired_at.insert(sequence.id.clone(), now);
        drop(guard);

        spawn_sequence_companions(app.clone(), sequence.id.clone());

        guard = state
            .lock()
            .map_err(|_| "sequence watcher state lock poisoned".to_string())?;
    }

    Ok(())
}
