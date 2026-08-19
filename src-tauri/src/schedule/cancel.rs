use chrono::Local;
use tauri::AppHandle;

use crate::schedule::fired::is_occurrence_fired;
use crate::schedule::storage::load_schedules_internal;
use crate::schedule::toast::apply_skip_side_effects;
use crate::schedule::window::{get_notify_context, get_schedule_window_context, notify_lead_minutes};

#[tauri::command]
pub fn cancel_upcoming_launch(app: AppHandle, schedule_id: String) -> Result<bool, String> {
    let schedules = load_schedules_internal(&app)?;
    let schedule = schedules
        .iter()
        .find(|item| item.id == schedule_id)
        .ok_or_else(|| "Schedule not found".to_string())?;

    if schedule.mode != "always" && schedule.mode != "once" {
        return Err("Cancel is only available for timed launches".into());
    }

    if !schedule.enabled {
        return Ok(false);
    }

    let now = Local::now();
    let lead = notify_lead_minutes(&schedule.notify).unwrap_or(0);

    let occurrence_key = if lead > 0 {
        get_notify_context(now, schedule, lead).occurrence_key
    } else {
        get_schedule_window_context(now, schedule).occurrence_key
    };

    let Some(occurrence_key) = occurrence_key else {
        return Err("There is no upcoming launch to cancel".into());
    };

    if schedule.mode == "always" && is_occurrence_fired(&app, &occurrence_key)? {
        return Ok(false);
    }

    apply_skip_side_effects(&app, &schedule.mode, &schedule.id, &occurrence_key)?;
    Ok(true)
}
