import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { AppTargetInfo } from "./types";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function resolveAppTarget(path: string): Promise<AppTargetInfo> {
  if (!isTauriRuntime()) {
    throw new Error("Проверка пути доступна только в приложении OnCue (Tauri)");
  }
  return invoke<AppTargetInfo>("resolve_app_target", { path });
}

export async function pickAppFile(): Promise<string | null> {
  if (!isTauriRuntime()) {
    throw new Error("Выбор файла доступен только в приложении OnCue (Tauri)");
  }

  const selected = await open({
    multiple: false,
    title: "Выберите приложение",
    filters: [
      {
        name: "Приложения",
        extensions: ["exe", "bat", "cmd", "com", "lnk"],
      },
    ],
  });

  if (selected === null) return null;
  if (Array.isArray(selected)) return selected[0] ?? null;
  return selected;
}
