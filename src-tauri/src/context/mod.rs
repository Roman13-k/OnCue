pub mod commands;

use crate::process::is_app_running;
use crate::schedule::storage::StoredSchedule;

#[cfg(windows)]
pub fn is_on_battery() -> bool {
    use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

    unsafe {
        let mut status = SYSTEM_POWER_STATUS::default();
        if GetSystemPowerStatus(&mut status).is_ok() {
            status.ACLineStatus == 0
        } else {
            false
        }
    }
}

#[cfg(not(windows))]
pub fn is_on_battery() -> bool {
    false
}

pub fn is_any_game_running(schedules: &[StoredSchedule]) -> bool {
    schedules.iter().any(|schedule| {
        schedule.is_game
            && !schedule.app_path.trim().is_empty()
            && is_app_running(&schedule.app_path)
    })
}

pub fn is_launch_blocked(
    schedules: &[StoredSchedule],
    schedule: &StoredSchedule,
    on_battery: bool,
    game_active: bool,
) -> bool {
    let _ = schedules;
    if schedule.skip_on_battery && on_battery {
        return true;
    }
    if game_active && !schedule.is_game {
        return true;
    }
    false
}

pub fn is_suggestion_launch_blocked(game_active: bool) -> bool {
    game_active
}
