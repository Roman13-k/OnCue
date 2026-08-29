import { looksLikeUrl, resolveAppTarget } from "../../apps/api";
import type { Schedule } from "../types";
import { markScheduleError, markScheduleHealthy } from "./buildSchedule";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Application file is unavailable";
}

export async function refreshSchedulesHealth(schedules: Schedule[]): Promise<Schedule[]> {
  if (schedules.length === 0) return schedules;

  return Promise.all(
    schedules.map(async (schedule) => {
      try {
        const info = await resolveAppTarget(schedule.appPath, { fetchIcon: false });
        if (looksLikeUrl(schedule.appPath)) {
          return markScheduleHealthy(schedule, {
            ...info,
            iconDataUrl: schedule.iconDataUrl ?? info.iconDataUrl,
          });
        }
        return markScheduleHealthy(schedule, info);
      } catch (err) {
        return markScheduleError(schedule, errorMessage(err));
      }
    }),
  );
}
