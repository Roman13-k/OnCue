use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use chrono::{Local, Utc};
use tauri::{AppHandle, Emitter};

use crate::launcher::launch_path;
use crate::schedule::fired::{is_occurrence_fired, mark_occurrence_fired};
use crate::schedule::storage::{load_schedules_internal, save_schedules_internal, StoredSchedule};
use crate::schedule::toast::{
    apply_skip_side_effects, show_launch_notice, LaunchNotice, NoticeDecision,
};
use crate::schedule::window::{
    get_notify_context, get_schedule_window_context, notify_lead_minutes,
};

const TICK_SECS: u64 = 5;

struct SchedulerState {
    once_armed: HashMap<String, bool>,
    prev_enabled: HashMap<String, bool>,
    in_flight: HashSet<String>,
    /// Occurrence keys that already showed a toast this session.
    notified: HashSet<String>,
}

impl Default for SchedulerState {
    fn default() -> Self {
        Self {
            once_armed: HashMap::new(),
            prev_enabled: HashMap::new(),
            in_flight: HashSet::new(),
            notified: HashSet::new(),
        }
    }
}

enum PendingLaunch {
    Always {
        id: String,
        path: String,
        occurrence_key: String,
    },
    Once {
        id: String,
        path: String,
    },
}

pub fn start(app: AppHandle) {
    let state = Arc::new(Mutex::new(SchedulerState::default()));

    thread::spawn(move || {
        loop {
            if let Err(error) = tick(&app, &state) {
                eprintln!("[OnCue] scheduler tick error: {error}");
            }
            thread::sleep(Duration::from_secs(TICK_SECS));
        }
    });
}

fn tick(app: &AppHandle, state: &Arc<Mutex<SchedulerState>>) -> Result<(), String> {
    let mut schedules = load_schedules_internal(app)?;

    {
        let mut guard = state
            .lock()
            .map_err(|_| "scheduler state lock poisoned".to_string())?;
        sync_once_armed(&mut guard, &schedules);
    }

    let now = Local::now();
    let mut pending = Vec::new();
    let mut notices = Vec::new();

    for schedule in &schedules {
        if !is_schedulable(schedule) {
            continue;
        }

        let lead = notify_lead_minutes(&schedule.notify);

        if let Some(lead_minutes) = lead {
            collect_notified_launch(
                app,
                state,
                schedule,
                now,
                lead_minutes,
                &mut notices,
                &mut pending,
            )?;
        } else {
            collect_immediate_launch(app, state, schedule, now, &mut pending)?;
        }
    }

    for notice in notices {
        let app_handle = app.clone();
        let state_handle = Arc::clone(state);

        show_launch_notice(
            notice,
            Arc::new(move |decision| {
                if let Err(error) = handle_notice_decision(&app_handle, &state_handle, decision) {
                    eprintln!("[OnCue] notice decision error: {error}");
                }
            }),
        );
    }

    let mut schedules_changed = false;

    for launch in pending {
        match launch {
            PendingLaunch::Always {
                id,
                path,
                occurrence_key,
            } => {
                {
                    let mut guard = state
                        .lock()
                        .map_err(|_| "scheduler state lock poisoned".to_string())?;
                    guard.in_flight.insert(id.clone());
                }

                match launch_path(&path) {
                    Ok(()) => {
                        mark_occurrence_fired(app, &occurrence_key)?;
                    }
                    Err(error) => {
                        eprintln!("[OnCue] scheduled launch failed for {id}: {error}");
                    }
                }

                if let Ok(mut guard) = state.lock() {
                    guard.in_flight.remove(&id);
                }
            }
            PendingLaunch::Once { id, path } => {
                {
                    let mut guard = state
                        .lock()
                        .map_err(|_| "scheduler state lock poisoned".to_string())?;
                    guard.in_flight.insert(id.clone());
                    guard.once_armed.insert(id.clone(), false);
                }

                if let Err(error) = launch_path(&path) {
                    eprintln!("[OnCue] once launch failed for {id}: {error}");
                }

                if let Ok(mut guard) = state.lock() {
                    guard.in_flight.remove(&id);
                }

                if pause_schedule(&mut schedules, &id) {
                    schedules_changed = true;
                }
            }
        }
    }

    if schedules_changed {
        save_schedules_internal(app, &schedules)?;
        let _ = app.emit("schedules-updated", ());
    }

    Ok(())
}

fn collect_immediate_launch(
    app: &AppHandle,
    state: &Arc<Mutex<SchedulerState>>,
    schedule: &StoredSchedule,
    now: chrono::DateTime<Local>,
    pending: &mut Vec<PendingLaunch>,
) -> Result<(), String> {
    let ctx = get_schedule_window_context(now, schedule);
    if !ctx.in_window {
        return Ok(());
    }

    let occurrence_key = match ctx.occurrence_key {
        Some(key) => key,
        None => return Ok(()),
    };

    push_pending_if_ready(app, state, schedule, occurrence_key, pending)
}

fn collect_notified_launch(
    app: &AppHandle,
    state: &Arc<Mutex<SchedulerState>>,
    schedule: &StoredSchedule,
    now: chrono::DateTime<Local>,
    lead_minutes: u32,
    notices: &mut Vec<LaunchNotice>,
    pending: &mut Vec<PendingLaunch>,
) -> Result<(), String> {
    if !schedule.enabled {
        return Ok(());
    }

    let notify_ctx = get_notify_context(now, schedule, lead_minutes);
    let window_ctx = get_schedule_window_context(now, schedule);

    // Heads-up toast once per occurrence (lead time or catch-up in window).
    if notify_ctx.should_notify {
        if let Some(occurrence_key) = notify_ctx.occurrence_key.clone() {
            let already_done = schedule.mode == "always"
                && is_occurrence_fired(app, &occurrence_key)?;

            let mut can_notify = !already_done;
            if schedule.mode == "once" {
                let guard = state
                    .lock()
                    .map_err(|_| "scheduler state lock poisoned".to_string())?;
                can_notify = can_notify
                    && guard
                        .once_armed
                        .get(&schedule.id)
                        .copied()
                        .unwrap_or(false);
            }

            if can_notify {
                let mut guard = state
                    .lock()
                    .map_err(|_| "scheduler state lock poisoned".to_string())?;
                if !guard.notified.contains(&occurrence_key) {
                    guard.notified.insert(occurrence_key.clone());
                    notices.push(LaunchNotice {
                        schedule_id: schedule.id.clone(),
                        app_name: schedule.app_name.clone(),
                        mode: schedule.mode.clone(),
                        occurrence_key,
                    });
                }
            }
        }
    }

    // Launch only when the real time window starts — not when the user presses Окей.
    if !window_ctx.in_window {
        return Ok(());
    }

    let occurrence_key = match window_ctx.occurrence_key {
        Some(key) => key,
        None => return Ok(()),
    };

    push_pending_if_ready(app, state, schedule, occurrence_key, pending)
}

fn push_pending_if_ready(
    app: &AppHandle,
    state: &Arc<Mutex<SchedulerState>>,
    schedule: &StoredSchedule,
    occurrence_key: String,
    pending: &mut Vec<PendingLaunch>,
) -> Result<(), String> {
    let guard = state
        .lock()
        .map_err(|_| "scheduler state lock poisoned".to_string())?;

    if schedule.mode == "always" {
        if !schedule.enabled || guard.in_flight.contains(&schedule.id) {
            return Ok(());
        }
        if is_occurrence_fired(app, &occurrence_key)? {
            return Ok(());
        }

        pending.push(PendingLaunch::Always {
            id: schedule.id.clone(),
            path: schedule.app_path.clone(),
            occurrence_key,
        });
        return Ok(());
    }

    if schedule.mode == "once" {
        if !schedule.enabled {
            return Ok(());
        }
        if !guard.once_armed.get(&schedule.id).copied().unwrap_or(false) {
            return Ok(());
        }
        if guard.in_flight.contains(&schedule.id) {
            return Ok(());
        }

        pending.push(PendingLaunch::Once {
            id: schedule.id.clone(),
            path: schedule.app_path.clone(),
        });
    }

    Ok(())
}

fn handle_notice_decision(
    app: &AppHandle,
    state: &Arc<Mutex<SchedulerState>>,
    decision: NoticeDecision,
) -> Result<(), String> {
    match decision {
        NoticeDecision::Acknowledge => Ok(()),
        NoticeDecision::Skip(notice) => {
            if notice.mode == "always" && is_occurrence_fired(app, &notice.occurrence_key)? {
                return Ok(());
            }

            if notice.mode == "once" {
                if let Ok(mut guard) = state.lock() {
                    guard.once_armed.insert(notice.schedule_id.clone(), false);
                }
            }

            apply_skip_side_effects(
                app,
                &notice.mode,
                &notice.schedule_id,
                &notice.occurrence_key,
            )
        }
    }
}

fn is_schedulable(schedule: &StoredSchedule) -> bool {
    (schedule.mode == "always" || schedule.mode == "once")
        && schedule.health == "ok"
        && !schedule.app_path.trim().is_empty()
}

fn sync_once_armed(state: &mut SchedulerState, schedules: &[StoredSchedule]) {
    for schedule in schedules {
        if schedule.mode != "once" {
            continue;
        }

        let prev_enabled = state.prev_enabled.get(&schedule.id).copied();
        if prev_enabled.is_none() {
            state
                .once_armed
                .insert(schedule.id.clone(), schedule.enabled);
        } else if prev_enabled != Some(schedule.enabled) {
            state
                .once_armed
                .insert(schedule.id.clone(), schedule.enabled);
        }

        state
            .prev_enabled
            .insert(schedule.id.clone(), schedule.enabled);
    }
}

fn pause_schedule(schedules: &mut [StoredSchedule], id: &str) -> bool {
    let mut changed = false;

    for schedule in schedules.iter_mut() {
        if schedule.id == id && schedule.enabled {
            schedule.enabled = false;
            schedule.updated_at = Utc::now().to_rfc3339();
            changed = true;
        }
    }

    changed
}
