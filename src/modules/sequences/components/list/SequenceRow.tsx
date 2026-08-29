import { cn } from "../../../../shared/lib/cn";
import { IconApp, IconLayers, IconMore } from "../../../../shared/ui/icons";
import type { Sequence } from "../../types";
import { getSequenceDisplayStatus } from "../../types";
import { ScheduleExceptionBadges, StatusBadge } from "../../../schedules/components/ui";
import type { ScheduleStatus } from "../../../schedules/types";

export const SEQUENCE_COLS =
  "grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_5.5rem_2.25rem]";

type SequenceRowProps = {
  sequence: Sequence;
  menuOpen: boolean;
  onToggleMenu: (sequence: Sequence, x: number, y: number) => void;
};

export function SequenceRow({ sequence, menuOpen, onToggleMenu }: SequenceRowProps) {
  const stepLabel =
    sequence.steps.length === 0
      ? "No companions"
      : `${sequence.steps.length} ${sequence.steps.length === 1 ? "companion" : "companions"}`;

  const status = getSequenceDisplayStatus(sequence) as ScheduleStatus;

  return (
    <li
      className="group border-b border-border-subtle last:border-b-0 bg-surface-elevated transition-colors duration-fast hover:bg-surface-hover/80"
      onContextMenu={(e) => {
        e.preventDefault();
        onToggleMenu(sequence, e.clientX, e.clientY);
      }}
    >
      <div
        className={`grid ${SEQUENCE_COLS} w-full items-center gap-x-3 px-3 py-3 transition-colors duration-fast`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-muted text-text-secondary">
            {sequence.triggerIconDataUrl ? (
              <img
                src={sequence.triggerIconDataUrl}
                alt=""
                className="size-7 object-contain"
                draggable={false}
              />
            ) : (
              <IconApp />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <IconLayers className="size-3.5 shrink-0 text-accent-fg" aria-hidden />
              <div className="truncate text-sm font-medium text-text-primary">{sequence.name}</div>
              <ScheduleExceptionBadges
                isGame={sequence.isGame}
                skipOnBattery={sequence.skipOnBattery}
              />
            </div>
            <div className="mt-0.5 truncate text-xs text-text-muted" title={sequence.triggerPath}>
              {sequence.triggerName}
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm text-text-primary">{sequence.triggerName}</div>
          <div className="mt-0.5 truncate text-xs text-text-muted" title={sequence.triggerPath}>
            {sequence.triggerPath}
          </div>
        </div>
        <div className="min-w-0 text-sm text-text-secondary">{stepLabel}</div>
        <div className="min-w-0">
          <StatusBadge status={status} />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            aria-label="Actions"
            aria-expanded={menuOpen}
            title="Actions"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              onToggleMenu(sequence, rect.right - 4, rect.bottom + 4);
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
