import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { AppTargetInfo } from "./types";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function looksLikeUrl(path: string): boolean {
  const lower = path.trim().toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("www.")
  );
}

export async function resolveAppTarget(
  path: string,
  options?: { fetchIcon?: boolean },
): Promise<AppTargetInfo> {
  if (!isTauriRuntime()) {
    throw new Error("Path checks are only available in the OnCue app (Tauri)");
  }
  return invoke<AppTargetInfo>("resolve_app_target", {
    path,
    fetchIcon: options?.fetchIcon ?? false,
  });
}

export async function pickAppFile(): Promise<string | null> {
  if (!isTauriRuntime()) {
    throw new Error("File picking is only available in the OnCue app (Tauri)");
  }

  const selected = await open({
    multiple: false,
    title: "Choose an application",
    filters: [
      {
        name: "Applications",
        extensions: ["exe", "bat", "cmd", "com", "lnk"],
      },
    ],
  });

  if (selected === null) return null;
  if (Array.isArray(selected)) return selected[0] ?? null;
  return selected;
}
