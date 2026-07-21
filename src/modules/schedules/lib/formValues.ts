import type { Schedule, ScheduleFormValues } from "../types";

export const DEFAULT_FORM_VALUES: ScheduleFormValues = {
  appPath: "",
  dayIds: ["mon", "tue", "wed", "thu", "fri"],
  timeFrom: "09:00",
  timeTo: "12:00",
  mode: "always",
  notify: "15m",
};

export function scheduleToFormValues(schedule: Schedule): ScheduleFormValues {
  return {
    appPath: schedule.appPath,
    dayIds: [...schedule.dayIds],
    timeFrom: schedule.timeFrom,
    timeTo: schedule.timeTo,
    mode: schedule.mode,
    notify: schedule.notify,
  };
}
