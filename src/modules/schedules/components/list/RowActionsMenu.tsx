import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "../../../../shared/lib/cn";
import { IconClose, IconEdit, IconPause, IconPlay, IconTrash } from "../../../../shared/ui/icons";
import type { Schedule } from "../../types";

export type RowMenuState = {
  scheduleId: string;
  x: number;
  y: number;
};

type RowActionsMenuProps = {
  menu: RowMenuState;
  schedule: Schedule;
  onClose: () => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
  onTogglePause: (schedule: Schedule) => void;
  onCancelUpcoming: (schedule: Schedule) => void;
};

export function RowActionsMenu({
  menu,
  schedule,
  onClose,
  onEdit,
  onDelete,
  onTogglePause,
  onCancelUpcoming,
}: RowActionsMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const pad = 8;
    let { x, y } = menu;

    if (x + rect.width > window.innerWidth - pad) {
      x = Math.max(pad, window.innerWidth - rect.width - pad);
    }
    if (y + rect.height > window.innerHeight - pad) {
      y = Math.max(pad, window.innerHeight - rect.height - pad);
    }

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, [menu]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [onClose]);

  const paused = !schedule.enabled;
  const canCancelUpcoming =
    schedule.enabled &&
    schedule.health === "ok" &&
    (schedule.mode === "always" || schedule.mode === "once");

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Schedule actions"
      className="fixed z-50 min-w-[11.5rem] overflow-hidden rounded-lg border border-border bg-surface-elevated py-1 shadow-lg"
      style={{ left: menu.x, top: menu.y }}
    >
      <MenuItem
        icon={<IconEdit />}
        label="Edit"
        onClick={() => {
          onEdit(schedule);
          onClose();
        }}
      />
      <MenuItem
        icon={paused ? <IconPlay /> : <IconPause />}
        label={paused ? "Resume" : "Pause"}
        onClick={() => {
          onTogglePause(schedule);
          onClose();
        }}
      />
      {canCancelUpcoming ? (
        <MenuItem
          icon={<IconClose />}
          label="Cancel launch"
          onClick={() => {
            onCancelUpcoming(schedule);
            onClose();
          }}
        />
      ) : null}
      <div className="my-1 border-t border-border-subtle" />
      <MenuItem
        icon={<IconTrash />}
        label="Delete"
        danger
        onClick={() => {
          onDelete(schedule);
          onClose();
        }}
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors duration-fast",
        danger
          ? "text-danger hover:bg-danger-soft"
          : "text-text-primary hover:bg-surface-hover",
      )}
    >
      <span className={cn(danger ? "text-danger" : "text-text-muted")}>{icon}</span>
      {label}
    </button>
  );
}
