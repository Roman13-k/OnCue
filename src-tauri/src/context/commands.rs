use serde::{Serialize};

use crate::context;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerStatus {
    pub on_battery: bool,
}

#[tauri::command]
pub fn get_power_status() -> PowerStatus {
    PowerStatus {
        on_battery: context::is_on_battery(),
    }
}
