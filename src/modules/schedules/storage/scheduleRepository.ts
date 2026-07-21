import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../apps/api";
import type { Schedule } from "../types";

function isSchedule(value: unknown): value is Schedule {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.appName === "string" &&
    typeof item.appPath === "string" &&
    (item.iconDataUrl === null || typeof item.iconDataUrl === "string") &&
    Array.isArray(item.dayIds) &&
    item.dayIds.every((day) => typeof day === "string") &&
    typeof item.timeFrom === "string" &&
    typeof item.timeTo === "string" &&
    typeof item.mode === "string" &&
    typeof item.notify === "string" &&
    typeof item.enabled === "boolean" &&
    (item.health === "ok" || item.health === "error") &&
    (item.errorMessage === null || typeof item.errorMessage === "string") &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
}

export async function loadSchedules(): Promise<Schedule[]> {
  // In non-tauri runtime (e.g. dev previews), there is no persistence layer.
  if (!isTauriRuntime()) return [];

  const schedules = await invoke<Schedule[]>("load_schedules");
  return schedules.filter(isSchedule);
}

export async function saveSchedules(schedules: Schedule[]): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("save_schedules", { schedules });
}

/** Skip the current/upcoming timed occurrence (always → done, once → pause). */
export async function cancelUpcomingLaunch(scheduleId: string): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  return invoke<boolean>("cancel_upcoming_launch", { scheduleId });
}
