import type { ScheduleMode } from "../../types";
import { MODE_LABEL } from "../../labels";

export function ModeLabel({ mode }: { mode: ScheduleMode }) {
  return <span className="text-sm text-text-secondary">{MODE_LABEL[mode]}</span>;
}
