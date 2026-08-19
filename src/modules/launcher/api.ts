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

export type BootLaunchResponse = {
  results: LaunchResult[];
  blocked: number;
};

export async function runBootLaunches(
  targets: BootLaunchTarget[],
): Promise<BootLaunchResponse> {
  if (!isTauriRuntime() || targets.length === 0) {
    return { results: [], blocked: 0 };
  }
  return invoke<BootLaunchResponse>("run_boot_launches", { targets });
}

export async function launchApplication(path: string): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("Launch is only available in the OnCue app");
  }
  return invoke("launch_application", { path });
}
