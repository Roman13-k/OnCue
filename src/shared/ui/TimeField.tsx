import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { IconChevronDown } from "./icons";

type TimeFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
};

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
};

const POPOVER_HEIGHT = 176;

function parseTime(value: string): { h: number; m: number } {
  const [hs = "0", ms = "0"] = value.split(":");
  const h = Math.min(23, Math.max(0, Number.parseInt(hs, 10) || 0));
  const m = Math.min(59, Math.max(0, Number.parseInt(ms, 10) || 0));
  return { h, m };
}

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function TimeField({ id, value, onChange }: TimeFieldProps) {
  const { h, m } = parseTime(value);
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPosition(null);
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < POPOVER_HEIGHT + 8 && rect.top > POPOVER_HEIGHT + 8;
      const top = openUp ? rect.top - POPOVER_HEIGHT - 6 : rect.bottom + 6;

      setPosition({
        top: Math.max(8, Math.min(top, window.innerHeight - POPOVER_HEIGHT - 8)),
        left: rect.left,
        width: rect.width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border bg-surface px-2.5 py-2 text-left text-sm text-text-primary shadow-xs transition-colors duration-fast hover:border-border-strong hover:bg-surface-hover/50 focus-visible:border-accent",
          open ? "border-accent" : "border-border",
        )}
      >
        <span className="font-medium tabular-nums tracking-wide">{formatTime(h, m)}</span>
        <IconChevronDown
          className={cn(
            "size-4 text-text-muted transition-transform duration-fast",
            open && "rotate-180 text-text-secondary",
          )}
        />
      </button>
      {open && position
        ? createPortal(
            <div
              ref={popoverRef}
              role="listbox"
              aria-label="Time picker"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: position.width,
                height: POPOVER_HEIGHT,
              }}
              className="z-50 grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg"
            >
              <TimeColumn
                label="Hours"
                values={Array.from({ length: 24 }, (_, i) => i)}
                selected={h}
                listId={`${listId}-h`}
                active={open}
                onSelect={(next) => {
                  onChange(formatTime(next, m));
                }}
              />
              <TimeColumn
                label="Minutes"
                values={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]}
                selected={m}
                listId={`${listId}-m`}
                active={open}
                onSelect={(next) => {
                  onChange(formatTime(h, next));
                }}
              />
            </div>,

            document.body,
          )
        : null}
    </>
  );
}

function TimeColumn({
  label,
  values,
  selected,
  listId,
  active,
  onSelect,
}: {
  label: string;
  values: number[];
  selected: number;
  listId: string;
  active: boolean;
  onSelect: (value: number) => void;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const options = values.includes(selected)
    ? values
    : [...values, selected].sort((a, b) => a - b);

  useEffect(() => {
    if (!active || !selectedRef.current || !scrollRef.current) return;

    const container = scrollRef.current;
    const item = selectedRef.current;
    const top = item.offsetTop - container.clientHeight / 2 + item.clientHeight / 2;
    container.scrollTop = Math.max(0, top);
  }, [active, selected]);

  return (
    <div className="flex min-h-0 min-w-0 flex-col border-border-subtle first:border-r">
      <div className="shrink-0 border-b border-border-subtle px-2 py-1.5 text-center text-[0.65rem] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </div>
      <div ref={scrollRef} id={listId} className="scroll-thin min-h-0 flex-1 overflow-y-auto py-1">
        {options.map((value) => {
          const isSelected = value === selected;
          return (
            <button
              key={value}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(value)}
              className={cn(
                "flex w-full cursor-pointer items-center justify-center px-2 py-1.5 text-sm tabular-nums transition-colors duration-fast",
                isSelected
                  ? "bg-accent-soft font-medium text-accent-fg"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
              )}
            >
              {String(value).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
