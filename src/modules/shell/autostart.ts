import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { isTauriRuntime } from "../apps/api";

/** Read/write helpers for a future settings toggle. Autostart itself is enabled in Rust. */
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
