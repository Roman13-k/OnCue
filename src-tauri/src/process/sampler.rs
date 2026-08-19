use std::thread;
use std::time::Duration;

use chrono::{Duration as ChronoDuration, Local, Timelike};
use tauri::{AppHandle, Manager};

use crate::db::{sync_usage_sample, Db};

use super::list_user_apps;

pub fn start(app: AppHandle) {
    thread::spawn(move || {
        run_sample(&app);

        loop {
            let wait = duration_until_next_quarter(Local::now());
            thread::sleep(wait);
            run_sample(&app);
        }
    });
}

pub fn sample_once(app: &AppHandle) {
    run_sample(app);
}

fn run_sample(app: &AppHandle) {
    if !crate::privacy::has_consent(app) {
        return;
    }

    let now = Local::now();
    let apps = list_user_apps();

    let Some(db) = app.try_state::<Db>() else {
        return;
    };

    let Ok(conn) = db.0.lock() else {
        return;
    };

    let _ = sync_usage_sample(&conn, &apps, now);
}

fn duration_until_next_quarter(now: chrono::DateTime<Local>) -> Duration {
    let next_minute = ((now.minute() as i64 / 15) + 1) * 15;

    let target = if next_minute >= 60 {
        (now + ChronoDuration::hours(1))
            .with_minute(0)
            .and_then(|t| t.with_second(0))
            .and_then(|t| t.with_nanosecond(0))
    } else {
        now.with_minute(next_minute as u32)
            .and_then(|t| t.with_second(0))
            .and_then(|t| t.with_nanosecond(0))
    };

    let target = target.unwrap_or_else(|| now + ChronoDuration::minutes(15));
    target
        .signed_duration_since(now)
        .to_std()
        .unwrap_or_else(|_| Duration::from_secs(15 * 60))
}
