mod apps;
mod boot;
mod context;
mod db;
mod launcher;
mod ml;
mod privacy;
mod process;
mod schedule;
mod tray;

use tauri::{Manager, RunEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_notification::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main(app);
        }));
    }

    let app = builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            apps::resolve_app_target,
            launcher::launch_application,
            boot::is_autostart_session,
            boot::run_boot_launches,
            schedule::storage::load_schedules,
            schedule::storage::save_schedules,
            schedule::cancel::cancel_upcoming_launch,
            db::db_list_recent_sessions,
            db::db_insert_session_start,
            ml::get_habit_suggestions,
            ml::autostart::load_suggestion_autostarts,
            ml::autostart::set_suggestion_autostart,
            privacy::get_privacy_consent,
            privacy::accept_privacy_consent,
            privacy::app_quit,
            context::commands::get_power_status,
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::MacosLauncher;

                app.handle().plugin(tauri_plugin_autostart::init(
                    MacosLauncher::LaunchAgent,
                    Some(vec![boot::autostart_arg().into()]),
                ))?;

                tray::create(app.handle())?;

                #[cfg(windows)]
                {
                    if let Err(error) = schedule::aumid::ensure_registered(app.handle()) {
                        eprintln!("[OnCue] toast AUMID registration failed: {error}");
                    }
                }

                match db::open(app.handle()) {
                    Ok(database) => {
                        app.manage(database);
                    }
                    Err(error) => {
                        eprintln!("[OnCue] database open failed (usage tracking disabled): {error}");
                    }
                }

                process::start(app.handle().clone());
                schedule::start(app.handle().clone());
            }

            if let Some(window) = app.get_webview_window("main") {
                let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))?;
                window.set_icon(icon)?;

                if !boot::is_autostart_session() {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let RunEvent::ExitRequested { .. } | RunEvent::Exit = event {
            db::finalize_on_shutdown(app_handle);
        }
    });
}
