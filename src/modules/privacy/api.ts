import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../apps/api";

export async function getPrivacyConsent(): Promise<boolean> {
  if (!isTauriRuntime()) return true;
  return invoke<boolean>("get_privacy_consent");
}

export async function acceptPrivacyConsent(): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("accept_privacy_consent");
}

export async function quitApp(): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("app_quit");
}
