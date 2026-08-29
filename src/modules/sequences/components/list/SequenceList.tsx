import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../../../shared/lib/cn";
import { IconEdit, IconPause, IconPlay, IconTrash } from "../../../../shared/ui/icons";
import type { Sequence } from "../../types";
import { SEQUENCE_COLS } from "./SequenceRow";
import { SequenceEmpty } from "./SequenceEmpty";
import { SequenceRow } from "./SequenceRow";

export type SequenceMenuState = {
  sequenceId: string;
  x: number;
  y: number;
};

type SequenceListProps = {
  sequences: Sequence[];
  onCreate: () => void;
  onEdit: (sequence: Sequence) => void;
  onDelete: (sequence: Sequence) => void;
  onTogglePause: (sequence: Sequence) => void;
};

export function SequenceList({
  sequences,
  onCreate,
  onEdit,
  onDelete,
  onTogglePause,
}: SequenceListProps) {
  const [menu, setMenu] = useState<SequenceMenuState | null>(null);

  const toggleMenu = useCallback((sequence: Sequence, x: number, y: number) => {
    setMenu((prev) => (prev?.sequenceId === sequence.id ? null : { sequenceId: sequence.id, x, y }));
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  if (sequences.length === 0) {
    return <SequenceEmpty onCreate={onCreate} />;
  }

  const menuSequence = menu
    ? sequences.find((item) => item.id === menu.sequenceId)
    : undefined;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-xs">
      <div
        className={`grid ${SEQUENCE_COLS} shrink-0 gap-x-3 border-b border-border-subtle bg-surface-muted/70 px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted`}
      >
        <span>Name</span>
        <span>Trigger</span>
        <span>Steps</span>
        <span>Status</span>
        <span aria-hidden />
      </div>
      <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {sequences.map((item) => (
          <SequenceRow
            key={item.id}
            sequence={item}
            menuOpen={menu?.sequenceId === item.id}
            onToggleMenu={toggleMenu}
          />
        ))}
      </ul>
      {menu && menuSequence ? (
        <SequenceActionsMenu
          menu={menu}
          sequence={menuSequence}
          onClose={closeMenu}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePause={onTogglePause}
        />
      ) : null}
    </div>
  );
}

function SequenceActionsMenu({
  menu,
  sequence,
  onClose,
  onEdit,
  onDelete,
  onTogglePause,
}: {
  menu: SequenceMenuState;
  sequence: Sequence;
  onClose: () => void;
  onEdit: (sequence: Sequence) => void;
  onDelete: (sequence: Sequence) => void;
  onTogglePause: (sequence: Sequence) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = !sequence.enabled;

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

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Sequence actions"
      className="fixed z-50 min-w-[11.5rem] overflow-hidden rounded-lg border border-border bg-surface-elevated py-1 shadow-lg"
      style={{ left: menu.x, top: menu.y }}
    >
      <MenuItem
        icon={<IconEdit />}
        label="Edit"
        onClick={() => {
          onEdit(sequence);
          onClose();
        }}
      />
      <MenuItem
        icon={paused ? <IconPlay /> : <IconPause />}
        label={paused ? "Resume" : "Pause"}
        onClick={() => {
          onTogglePause(sequence);
          onClose();
        }}
      />
      <div className="my-1 border-t border-border-subtle" />
      <MenuItem
        icon={<IconTrash />}
        label="Delete"
        danger
        onClick={() => {
          onDelete(sequence);
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
        danger ? "text-danger hover:bg-danger-soft" : "text-text-primary hover:bg-surface-hover",
      )}
    >
      <span className={cn(danger ? "text-danger" : "text-text-muted")}>{icon}</span>
      {label}
    </button>
  );
}
