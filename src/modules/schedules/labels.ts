import type { NotifyLead, Schedule, ScheduleMode, ScheduleStatus, WeekdayId } from "./types";

export const WEEKDAYS: { id: WeekdayId; label: string }[] = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

export const MODE_LABEL: Record<ScheduleMode, string> = {
  boot: "At startup",
  always: "On schedule",
  once: "Once",
};

export const NOTIFY_LABEL: Record<NotifyLead, string> = {
  none: "None",
  "15m": "15 min before",
  "30m": "30 min before",
  "1h": "1 hour before",
};

export const STATUS_LABEL: Record<ScheduleStatus, string> = {
  active: "Active",
  paused: "Paused",
  error: "Error",
};

const DAY_SHORT: Record<WeekdayId, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const DAY_ORDER: WeekdayId[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function getDisplayStatus(schedule: Schedule): ScheduleStatus {
  if (schedule.health === "error") return "error";
  return schedule.enabled ? "active" : "paused";
}

export function formatDays(dayIds: WeekdayId[]): string {
  if (dayIds.length === 0) return "No days selected";
  if (dayIds.length === 7) return "Every day";

  const sorted = [...dayIds].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const indices = sorted.map((id) => DAY_ORDER.indexOf(id));
  const isContiguous = indices.every((value, i) => i === 0 || value === indices[i - 1]! + 1);

  if (isContiguous && sorted.length >= 2) {
    return `${DAY_SHORT[sorted[0]!]}–${DAY_SHORT[sorted[sorted.length - 1]!]}`;
  }

  return sorted.map((id) => DAY_SHORT[id]).join(", ");
}

export function formatWhenPrimary(schedule: Schedule): string {
  if (schedule.mode === "boot") return "Every time the PC starts";
  return formatDays(schedule.dayIds);
}

export function formatWhenSecondary(schedule: Schedule): string | null {
  if (schedule.mode === "boot") return null;
  if (!schedule.timeTo || schedule.timeFrom === schedule.timeTo) {
    return schedule.timeFrom;
  }
  return `${schedule.timeFrom}–${schedule.timeTo}`;
}

export function formatTimeRange(mode: ScheduleMode, timeFrom: string, timeTo: string): string {
  if (mode === "boot") return "Every time the PC starts";
  if (!timeTo || timeFrom === timeTo) return timeFrom;
  return `${timeFrom}–${timeTo}`;
}
