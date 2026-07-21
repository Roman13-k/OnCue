mod apps;
mod boot;
mod launcher;
mod schedule;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Must be registered first so a second launch is redirected, not duplicated.
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_notification::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main(app);
        }));
    }

    builder
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
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::MacosLauncher;
                use tauri_plugin_autostart::ManagerExt;

                app.handle().plugin(tauri_plugin_autostart::init(
                    MacosLauncher::LaunchAgent,
                    Some(vec![boot::autostart_arg().into()]),
                ))?;

                let autolaunch = app.autolaunch();
                let _ = autolaunch.disable();
                let _ = autolaunch.enable();

                tray::create(app.handle())?;

                #[cfg(windows)]
                {
                    if let Err(error) = schedule::aumid::ensure_registered(app.handle()) {
                        eprintln!("[OnCue] toast AUMID registration failed: {error}");
                    }
                }

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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
