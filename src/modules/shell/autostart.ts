import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { isTauriRuntime } from "../apps/api";

export async function getAppAutostartEnabled(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  return isEnabled();
}

export async function setAppAutostart(enabled: boolean): Promise<void> {
  if (!isTauriRuntime()) return;
  if (enabled) {
    await enable();
  } else {
    await disable();
  }
}
