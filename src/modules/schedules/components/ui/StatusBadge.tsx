import { cn } from "../../../../shared/lib/cn";
import type { ScheduleStatus } from "../../types";
import { STATUS_LABEL } from "../../labels";

export function StatusBadge({ status }: { status: ScheduleStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        status === "active" && "bg-success-soft text-success",
        status === "paused" && "bg-surface-muted text-text-secondary",
        status === "error" && "bg-danger-soft text-danger",
      )}
      title={STATUS_LABEL[status]}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "active" && "bg-success",
          status === "paused" && "bg-text-muted",
          status === "error" && "bg-danger",
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
