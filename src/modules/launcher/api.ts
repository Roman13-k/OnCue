import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../apps/api";

export type BootLaunchTarget = {
  id: string;
  path: string;
};

export type LaunchResult = {
  path: string;
  ok: boolean;
  error: string | null;
};

export async function isAutostartSession(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  return invoke<boolean>("is_autostart_session");
}

/** Runs once per OnCue process when started via OS login (--autostart). */
export async function runBootLaunches(
  targets: BootLaunchTarget[],
): Promise<LaunchResult[]> {
  if (!isTauriRuntime() || targets.length === 0) return [];
  return invoke<LaunchResult[]>("run_boot_launches", { targets });
}

export async function launchApplication(path: string): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("Запуск доступен только в приложении OnCue");
  }
  return invoke("launch_application", { path });
}
