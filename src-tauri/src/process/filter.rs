use std::collections::HashSet;

use super::{normalize_path, ProcessInfo};

const EXCLUDED_NAMES: &[&str] = &[
    "cmd.exe",
    "powershell.exe",
    "pwsh.exe",
    "conhost.exe",
    "svchost.exe",
    "dllhost.exe",
    "taskhostw.exe",
    "sihost.exe",
    "ctfmon.exe",
    "explorer.exe",
    "runtimebroker.exe",
    "applicationframehost.exe",
    "searchhost.exe",
    "shellexperiencehost.exe",
    "startmenuexperiencehost.exe",
    "textinputhost.exe",
    "systemsettings.exe",
    "smartscreen.exe",
    "securityhealthsystray.exe",
    "securityhealthservice.exe",
    "msedgewebview2.exe",
    "widgetservice.exe",
    "widgets.exe",
    "phoneexperiencehost.exe",
    "crossdeviceresume.exe",
    "useroobebroker.exe",
    "shellhost.exe",
    "appactions.exe",
    "backgroundtaskhost.exe",
    "wermgr.exe",
    "winlogon.exe",
    "csrss.exe",
    "smss.exe",
    "lsass.exe",
    "services.exe",
    "fontdrvhost.exe",
    "dwm.exe",
    "audiodg.exe",
    "searchindexer.exe",
    "compattelrunner.exe",
    "oncue.exe",
    "cargo.exe",
    "rustc.exe",
    "rustup.exe",
    "rust-analyzer.exe",
    "rust-analyzer-proc-macro-srv.exe",
    "esbuild.exe",
    "node.exe",
    "npm.exe",
    "vite.exe",

    "ipoint.exe",
    "itype.exe",
    "mkchelper.exe",
    "vctip.exe",
    "sdxhelper.exe",
    "accuserps.exe",
    "aqauserps.exe",
];

const EXCLUDED_PATH_PREFIXES: &[&str] = &[
    r"c:\windows\",
    r"c:\program files\windowsapps\",
    r"c:\program files (x86)\microsoft\edgewebview\",
    r"c:\programdata\microsoft\",
];

const EXCLUDED_PATH_FRAGMENTS: &[&str] = &[
    r"\windowsapps\",
    r"\systemapps\",
    r"\driverstore\",
    r"\immersivecontrolpanel\",
    r"\node_modules\",
    r"\.rustup\",
    r"\.cargo\",
    r"\appdata\local\temp\",
    r"\appdata\local\tmp\",

    r"\microsoft mouse and keyboard center\",
    r"\acergaicamera\",
    r"\acerccagent\",
    r"\acerqaagent\",
    r"\microsoft visual studio\",
    r"\vc\tools\msvc\",
];

const EXCLUDED_NAME_SUFFIXES: &[&str] = &[
    "helper.exe",
    "userps.exe",
    "service.exe",
    "svc.exe",
    "agent.exe",
    "broker.exe",
    "host.exe",
    "tray.exe",
    "updater.exe",
];

pub fn is_user_app(process: &ProcessInfo) -> bool {
    let Some(raw_path) = process.exe_path.as_deref().filter(|p| !p.is_empty()) else {
        return false;
    };

    let name = process.name.to_lowercase();
    if EXCLUDED_NAMES.iter().any(|n| *n == name) {
        return false;
    }

    if EXCLUDED_NAME_SUFFIXES
        .iter()
        .any(|suffix| name.ends_with(suffix))
    {
        return false;
    }

    let path = normalize_path(raw_path);

    if EXCLUDED_PATH_PREFIXES
        .iter()
        .any(|prefix| path.starts_with(prefix))
    {
        return false;
    }

    if EXCLUDED_PATH_FRAGMENTS
        .iter()
        .any(|fragment| path.contains(fragment))
    {
        return false;
    }

    if name.contains("setup") || name.contains("update") || name.ends_with(".tmp") {
        return false;
    }

    true
}

pub fn unique_user_apps(processes: impl IntoIterator<Item = ProcessInfo>) -> Vec<ProcessInfo> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();

    for process in processes {
        if !is_user_app(&process) {
            continue;
        }

        let Some(path) = process.exe_path.as_deref() else {
            continue;
        };
        let key = normalize_path(path);
        if !seen.insert(key) {
            continue;
        }

        out.push(process);
    }

    out.sort_by(|a, b| {
        a.name
            .to_lowercase()
            .cmp(&b.name.to_lowercase())
            .then_with(|| {
                a.exe_path
                    .as_deref()
                    .unwrap_or("")
                    .to_lowercase()
                    .cmp(&b.exe_path.as_deref().unwrap_or("").to_lowercase())
            })
    });

    out
}
