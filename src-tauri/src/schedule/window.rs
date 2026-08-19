use chrono::{Datelike, Local, NaiveDate, Timelike};

use crate::schedule::storage::StoredSchedule;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WindowContext {
    pub in_window: bool,
    pub occurrence_key: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NotifyContext {

    pub should_notify: bool,

    pub in_window: bool,
    pub occurrence_key: Option<String>,
}

pub fn notify_lead_minutes(notify: &str) -> Option<u32> {
    match notify {
        "15m" => Some(15),
        "30m" => Some(30),
        "1h" => Some(60),
        _ => None,
    }
}

fn parse_time_to_minutes(time: &str) -> u32 {
    let mut parts = time.split(':');
    let hours = parts
        .next()
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(0)
        .min(23);
    let minutes = parts
        .next()
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(0)
        .min(59);
    hours * 60 + minutes
}

fn weekday_id(weekday: chrono::Weekday) -> &'static str {
    match weekday {
        chrono::Weekday::Mon => "mon",
        chrono::Weekday::Tue => "tue",
        chrono::Weekday::Wed => "wed",
        chrono::Weekday::Thu => "thu",
        chrono::Weekday::Fri => "fri",
        chrono::Weekday::Sat => "sat",
        chrono::Weekday::Sun => "sun",
    }
}

fn is_day_selected(date: NaiveDate, day_ids: &[String]) -> bool {
    if day_ids.is_empty() {
        return false;
    }

    let id = weekday_id(date.weekday());
    day_ids.iter().any(|day| day == id)
}

fn format_occurrence_key(
    schedule_id: &str,
    window_start: NaiveDate,
    time_from: &str,
    time_to: &str,
) -> String {
    format!(
        "{schedule_id}|{}|{time_from}|{time_to}",
        window_start.format("%Y-%m-%d")
    )
}

pub fn get_schedule_window_context(
    now: chrono::DateTime<Local>,
    schedule: &StoredSchedule,
) -> WindowContext {
    let from_min = parse_time_to_minutes(&schedule.time_from);
    let to_min = parse_time_to_minutes(&schedule.time_to);
    let now_min = now.hour() * 60 + now.minute();
    let today = now.date_naive();

    if from_min == to_min {
        if !is_day_selected(today, &schedule.day_ids) || now_min != from_min {
            return WindowContext {
                in_window: false,
                occurrence_key: None,
            };
        }

        return WindowContext {
            in_window: true,
            occurrence_key: Some(format_occurrence_key(
                &schedule.id,
                today,
                &schedule.time_from,
                &schedule.time_to,
            )),
        };
    }

    if from_min < to_min {
        if !is_day_selected(today, &schedule.day_ids) || now_min < from_min || now_min > to_min {
            return WindowContext {
                in_window: false,
                occurrence_key: None,
            };
        }

        return WindowContext {
            in_window: true,
            occurrence_key: Some(format_occurrence_key(
                &schedule.id,
                today,
                &schedule.time_from,
                &schedule.time_to,
            )),
        };
    }

    if now_min >= from_min {
        if !is_day_selected(today, &schedule.day_ids) {
            return WindowContext {
                in_window: false,
                occurrence_key: None,
            };
        }

        return WindowContext {
            in_window: true,
            occurrence_key: Some(format_occurrence_key(
                &schedule.id,
                today,
                &schedule.time_from,
                &schedule.time_to,
            )),
        };
    }

    if now_min <= to_min {
        let yesterday = today.pred_opt().unwrap_or(today);
        if !is_day_selected(yesterday, &schedule.day_ids) {
            return WindowContext {
                in_window: false,
                occurrence_key: None,
            };
        }

        return WindowContext {
            in_window: true,
            occurrence_key: Some(format_occurrence_key(
                &schedule.id,
                yesterday,
                &schedule.time_from,
                &schedule.time_to,
            )),
        };
    }

    WindowContext {
        in_window: false,
        occurrence_key: None,
    }
}

pub fn get_notify_context(
    now: chrono::DateTime<Local>,
    schedule: &StoredSchedule,
    lead_minutes: u32,
) -> NotifyContext {
    let window = get_schedule_window_context(now, schedule);
    if window.in_window {
        return NotifyContext {
            should_notify: true,
            in_window: true,
            occurrence_key: window.occurrence_key,
        };
    }

    let from_min = parse_time_to_minutes(&schedule.time_from);
    let to_min = parse_time_to_minutes(&schedule.time_to);
    let now_min = now.hour() * 60 + now.minute();
    let today = now.date_naive();

    if from_min <= to_min {
        if !is_day_selected(today, &schedule.day_ids) || now_min >= from_min {
            return NotifyContext {
                should_notify: false,
                in_window: false,
                occurrence_key: None,
            };
        }

        let mins_until = from_min - now_min;
        if mins_until > lead_minutes {
            return NotifyContext {
                should_notify: false,
                in_window: false,
                occurrence_key: None,
            };
        }

        return NotifyContext {
            should_notify: true,
            in_window: false,
            occurrence_key: Some(format_occurrence_key(
                &schedule.id,
                today,
                &schedule.time_from,
                &schedule.time_to,
            )),
        };
    }

    if is_day_selected(today, &schedule.day_ids) && now_min < from_min {
        let mins_until = from_min - now_min;
        if mins_until <= lead_minutes {
            return NotifyContext {
                should_notify: true,
                in_window: false,
                occurrence_key: Some(format_occurrence_key(
                    &schedule.id,
                    today,
                    &schedule.time_from,
                    &schedule.time_to,
                )),
            };
        }
    }

    NotifyContext {
        should_notify: false,
        in_window: false,
        occurrence_key: None,
    }
}
