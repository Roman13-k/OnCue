import type { AppTargetInfo } from "../../apps/types";
import type { Schedule, ScheduleFormValues } from "../types";
import { createId } from "./ids";

export function createSchedule(
  values: ScheduleFormValues,
  app: AppTargetInfo,
): Schedule {
  const now = new Date().toISOString();
  return {
    id: createId(),
    appName: app.name,
    appPath: app.path,
    iconDataUrl: app.iconDataUrl,
    dayIds: [...values.dayIds],
    timeFrom: values.timeFrom,
    timeTo: values.timeTo,
    mode: values.mode,
    notify: values.notify,
    skipOnBattery: values.skipOnBattery,
    isGame: values.isGame,
    enabled: true,
    health: "ok",
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateSchedule(
  existing: Schedule,
  values: ScheduleFormValues,
  app: AppTargetInfo,
): Schedule {
  return {
    ...existing,
    appName: app.name,
    appPath: app.path,
    iconDataUrl: app.iconDataUrl ?? existing.iconDataUrl,
    dayIds: [...values.dayIds],
    timeFrom: values.timeFrom,
    timeTo: values.timeTo,
    mode: values.mode,
    notify: values.notify,
    skipOnBattery: values.skipOnBattery,
    isGame: values.isGame,
    health: "ok",
    errorMessage: null,
    updatedAt: new Date().toISOString(),
  };
}

export function markScheduleError(schedule: Schedule, message: string): Schedule {
  return {
    ...schedule,
    health: "error",
    errorMessage: message,
    updatedAt: new Date().toISOString(),
  };
}

export function markScheduleHealthy(
  schedule: Schedule,
  app: AppTargetInfo,
): Schedule {
  return {
    ...schedule,
    appName: app.name,
    appPath: app.path,
    iconDataUrl: app.iconDataUrl ?? schedule.iconDataUrl,
    health: "ok",
    errorMessage: null,
    updatedAt: new Date().toISOString(),
  };
}
