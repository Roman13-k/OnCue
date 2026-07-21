//! Windows toast notifications with OK / Cancel actions.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use tauri::AppHandle;

#[derive(Debug, Clone)]
pub struct LaunchNotice {
    pub schedule_id: String,
    pub app_name: String,
    pub mode: String,
    pub occurrence_key: String,
}

#[derive(Debug, Clone)]
pub enum NoticeDecision {
    /// Окей or ✕ — close the toast; launch still happens on schedule.
    Acknowledge,
    /// Отменить — skip this occurrence (mark done / pause).
    Skip(LaunchNotice),
}

pub type DecisionHandler = Arc<dyn Fn(NoticeDecision) + Send + Sync + 'static>;

const ACTION_OK: &str = "ok";
const ACTION_CANCEL: &str = "cancel";

/// Show a reminder toast: app name + Окей / Отменить.
/// Native ✕ only dismisses the toast (same as Окей).
pub fn show_launch_notice(notice: LaunchNotice, on_decision: DecisionHandler) {
    #[cfg(windows)]
    {
        show_launch_notice_windows(notice, on_decision);
    }

    #[cfg(not(windows))]
    {
        let _ = (notice, on_decision);
        eprintln!("[OnCue] launch notices are only supported on Windows");
    }
}

#[cfg(windows)]
fn show_launch_notice_windows(notice: LaunchNotice, on_decision: DecisionHandler) {
    use tauri_winrt_notification::{IconCrop, Scenario, Toast, ToastDismissalReason};

    use crate::schedule::aumid::{toast_icon_path, AUMID};

    let app_name = notice.app_name.clone();
    let settled = Arc::new(AtomicBool::new(false));

    let decide: Arc<dyn Fn(NoticeDecision) + Send + Sync> = {
        let settled = Arc::clone(&settled);
        let on_decision = Arc::clone(&on_decision);
        Arc::new(move |decision: NoticeDecision| {
            if settled.swap(true, Ordering::SeqCst) {
                return;
            }
            on_decision(decision);
        })
    };

    let on_activated = {
        let notice = notice.clone();
        let decide = Arc::clone(&decide);
        move |action: Option<String>| {
            match action.as_deref() {
                Some(ACTION_CANCEL) => decide(NoticeDecision::Skip(notice.clone())),
                // Окей or body click — acknowledge, keep schedule.
                Some(ACTION_OK) | None => decide(NoticeDecision::Acknowledge),
                _ => {}
            }
            Ok(())
        }
    };

    let on_dismissed = {
        let decide = Arc::clone(&decide);
        move |reason: Option<ToastDismissalReason>| {
            // ✕ / swipe away — only close the toast, do not cancel the launch.
            if reason == Some(ToastDismissalReason::UserCanceled) {
                decide(NoticeDecision::Acknowledge);
            }
            Ok(())
        }
    };

    let body = format!("Скоро запустится «{app_name}»");

    let mut toast = Toast::new(AUMID)
        .title("OnCue")
        .text1(&body)
        .scenario(Scenario::Reminder)
        .add_button("Окей", ACTION_OK)
        .add_button("Отменить", ACTION_CANCEL)
        .on_activated(on_activated)
        .on_dismissed(on_dismissed);

    if let Some(icon) = toast_icon_path() {
        toast = toast.icon(icon.as_path(), IconCrop::Square, "OnCue");
    }

    let result = toast.show();

    if let Err(error) = result {
        eprintln!(
            "[OnCue] failed to show launch notice for {}: {error}",
            notice.schedule_id
        );
        // Fail open: keep the scheduled launch.
        decide(NoticeDecision::Acknowledge);
    }
}

/// Skip this occurrence: mark fired (always) or pause (once).
pub fn apply_skip_side_effects(
    app: &AppHandle,
    mode: &str,
    schedule_id: &str,
    occurrence_key: &str,
) -> Result<(), String> {
    use chrono::Utc;
    use tauri::Emitter;

    use crate::schedule::fired::mark_occurrence_fired;
    use crate::schedule::storage::{load_schedules_internal, save_schedules_internal};

    if mode == "always" {
        mark_occurrence_fired(app, occurrence_key)?;
        return Ok(());
    }

    if mode == "once" {
        let mut schedules = load_schedules_internal(app)?;
        let mut changed = false;
        for schedule in schedules.iter_mut() {
            if schedule.id == schedule_id && schedule.enabled {
                schedule.enabled = false;
                schedule.updated_at = Utc::now().to_rfc3339();
                changed = true;
            }
        }
        if changed {
            save_schedules_internal(app, &schedules)?;
            let _ = app.emit("schedules-updated", ());
        }
    }

    Ok(())
}
