import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "../../../../shared/lib/cn";
import { IconApp, IconGrip, IconMore } from "../../../../shared/ui/icons";
import { formatWhenPrimary, formatWhenSecondary, getDisplayStatus, NOTIFY_LABEL } from "../../labels";
import type { Schedule } from "../../types";
import { ModeLabel, StatusBadge } from "../ui";
import { SCHEDULE_COLS } from "./scheduleCols";

type ScheduleRowProps = {
  schedule: Schedule;
  reorderEnabled: boolean;
  menuOpen: boolean;
  onToggleMenu: (schedule: Schedule, x: number, y: number) => void;
};

export function ScheduleRow({ schedule, reorderEnabled, menuOpen, onToggleMenu }: ScheduleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: schedule.id,
    disabled: !reorderEnabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const status = getDisplayStatus(schedule);
  const whenPrimary = formatWhenPrimary(schedule);
  const whenSecondary = formatWhenSecondary(schedule);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group border-b border-border-subtle last:border-b-0",
        isDragging ? "relative z-10 bg-surface-elevated opacity-90 shadow-md" : "bg-surface-elevated",
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        onToggleMenu(schedule, e.clientX, e.clientY);
      }}
    >
      <div
        className={`grid ${SCHEDULE_COLS} w-full items-center gap-x-3 px-3 py-3 transition-colors duration-fast hover:bg-surface-hover/80`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors duration-fast",
              reorderEnabled
                ? "cursor-grab hover:bg-surface-muted hover:text-text-secondary active:cursor-grabbing"
                : "cursor-default opacity-45",
            )}
            aria-label={reorderEnabled ? "Перетащить" : "Перетаскивание отключено во время сортировки"}
            {...(reorderEnabled ? attributes : {})}
            {...(reorderEnabled ? listeners : {})}
          >
            <IconGrip />
          </button>
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-muted text-text-secondary">
            {schedule.iconDataUrl ? (
              <img
                src={schedule.iconDataUrl}
                alt=""
                className="size-7 object-contain"
                draggable={false}
              />
            ) : (
              <IconApp />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-text-primary">{schedule.appName}</div>
            <div className="mt-0.5 truncate text-xs text-text-muted" title={schedule.errorMessage ?? schedule.appPath}>
              {schedule.health === "error" && schedule.errorMessage
                ? schedule.errorMessage
                : schedule.appPath}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm text-text-primary">{whenPrimary}</div>
          {whenSecondary ? (
            <div className="mt-0.5 truncate text-xs text-text-muted">{whenSecondary}</div>
          ) : null}
        </div>

        <div className="min-w-0">
          <ModeLabel mode={schedule.mode} />
        </div>

        <div className="min-w-0 text-sm text-text-secondary">
          {NOTIFY_LABEL[schedule.notify]}
        </div>

        <div className="min-w-0">
          <StatusBadge status={status} />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            aria-label="Действия"
            aria-expanded={menuOpen}
            title="Действия"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              onToggleMenu(schedule, rect.right - 4, rect.bottom + 4);
            }}
            className={cn(
              "inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors duration-fast hover:bg-surface-muted hover:text-text-primary",
              menuOpen && "bg-surface-muted text-text-primary",
            )}
          >
            <IconMore />
          </button>
        </div>
      </div>
    </li>
  );
}
