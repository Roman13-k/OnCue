export type ScheduleMode = "boot" | "always" | "once";
export type NotifyLead = "none" | "15m" | "30m" | "1h";
export type WeekdayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** Runtime health of the target file. */
export type ScheduleHealth = "ok" | "error";

/** Status shown in the UI. */
export type ScheduleStatus = "active" | "paused" | "error";

export type Schedule = {
  id: string;
  appName: string;
  appPath: string;
  iconDataUrl: string | null;
  dayIds: WeekdayId[];
  timeFrom: string;
  timeTo: string;
  mode: ScheduleMode;
  notify: NotifyLead;
  /** User intent: run when scheduler logic is enabled. */
  enabled: boolean;
  health: ScheduleHealth;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleFormValues = {
  appPath: string;
  dayIds: WeekdayId[];
  timeFrom: string;
  timeTo: string;
  mode: ScheduleMode;
  notify: NotifyLead;
};

export type PanelState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; scheduleId: string };
