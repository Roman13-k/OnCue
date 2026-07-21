import type { NotifyLead, Schedule, ScheduleMode, ScheduleStatus, WeekdayId } from "./types";

export const WEEKDAYS: { id: WeekdayId; label: string }[] = [
  { id: "mon", label: "Пн" },
  { id: "tue", label: "Вт" },
  { id: "wed", label: "Ср" },
  { id: "thu", label: "Чт" },
  { id: "fri", label: "Пт" },
  { id: "sat", label: "Сб" },
  { id: "sun", label: "Вс" },
];

export const MODE_LABEL: Record<ScheduleMode, string> = {
  boot: "Автозагрузка",
  always: "По расписанию",
  once: "Один раз",
};

export const NOTIFY_LABEL: Record<NotifyLead, string> = {
  none: "Нет",
  "15m": "за 15 мин",
  "30m": "за 30 мин",
  "1h": "за 1 час",
};

export const STATUS_LABEL: Record<ScheduleStatus, string> = {
  active: "Активно",
  paused: "Пауза",
  error: "Ошибка",
};

const DAY_SHORT: Record<WeekdayId, string> = {
  mon: "Пн",
  tue: "Вт",
  wed: "Ср",
  thu: "Чт",
  fri: "Пт",
  sat: "Сб",
  sun: "Вс",
};

const DAY_ORDER: WeekdayId[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function getDisplayStatus(schedule: Schedule): ScheduleStatus {
  if (schedule.health === "error") return "error";
  return schedule.enabled ? "active" : "paused";
}

export function formatDays(dayIds: WeekdayId[]): string {
  if (dayIds.length === 0) return "Дни не выбраны";
  if (dayIds.length === 7) return "Каждый день";

  const sorted = [...dayIds].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const indices = sorted.map((id) => DAY_ORDER.indexOf(id));
  const isContiguous = indices.every((value, i) => i === 0 || value === indices[i - 1]! + 1);

  if (isContiguous && sorted.length >= 2) {
    return `${DAY_SHORT[sorted[0]!]}–${DAY_SHORT[sorted[sorted.length - 1]!]}`;
  }

  return sorted.map((id) => DAY_SHORT[id]).join(", ");
}

/** Primary line in the «Когда» column. */
export function formatWhenPrimary(schedule: Schedule): string {
  if (schedule.mode === "boot") return "При каждом включении ПК";
  return formatDays(schedule.dayIds);
}

/** Secondary line in the «Когда» column; null = hide. */
export function formatWhenSecondary(schedule: Schedule): string | null {
  if (schedule.mode === "boot") return null;
  if (!schedule.timeTo || schedule.timeFrom === schedule.timeTo) {
    return schedule.timeFrom;
  }
  return `${schedule.timeFrom}–${schedule.timeTo}`;
}

export function formatTimeRange(mode: ScheduleMode, timeFrom: string, timeTo: string): string {
  if (mode === "boot") return "При каждом включении ПК";
  if (!timeTo || timeFrom === timeTo) return timeFrom;
  return `${timeFrom}–${timeTo}`;
}
