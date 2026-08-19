import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useCallback, useMemo, useState } from "react";
import {
  formatWhenPrimary,
  formatWhenSecondary,
  getDisplayStatus,
  MODE_LABEL,
  NOTIFY_LABEL,
  STATUS_LABEL,
} from "../../labels";
import { cn } from "../../../../shared/lib/cn";
import { IconSort, IconSortAsc, IconSortDesc } from "../../../../shared/ui/icons";
import type { Schedule } from "../../types";
import { RowActionsMenu, type RowMenuState } from "./RowActionsMenu";
import { ScheduleEmpty } from "./ScheduleEmpty";
import { ScheduleRow } from "./ScheduleRow";
import { SCHEDULE_COLS } from "./scheduleCols";

type ScheduleListProps = {
  schedules: Schedule[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onCreate: () => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
  onTogglePause: (schedule: Schedule) => void;
  onCancelUpcoming: (schedule: Schedule) => void;
};

type SortColumn = "app" | "when" | "mode" | "notify" | "status";
type SortDirection = "asc" | "desc";
type SortState = { column: SortColumn; direction: SortDirection } | null;

export function ScheduleList({
  schedules,
  onReorder,
  onCreate,
  onEdit,
  onDelete,
  onTogglePause,
  onCancelUpcoming,
}: ScheduleListProps) {
  const [menu, setMenu] = useState<RowMenuState | null>(null);
  const [sort, setSort] = useState<SortState>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleMenu = useCallback((schedule: Schedule, x: number, y: number) => {
    setMenu((prev) => {
      if (prev?.scheduleId === schedule.id) return null;
      return { scheduleId: schedule.id, x, y };
    });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  const displayedSchedules = useMemo(() => {
    if (!sort) return schedules;

    const sorted = [...schedules];
    sorted.sort((left, right) => compareSchedules(left, right, sort));
    return sorted;
  }, [schedules, sort]);

  if (schedules.length === 0) {
    return <ScheduleEmpty onCreate={onCreate} />;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (sort) return;

    const fromIndex = schedules.findIndex((item) => item.id === active.id);
    const toIndex = schedules.findIndex((item) => item.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    onReorder(fromIndex, toIndex);
  }

  const menuSchedule = menu
    ? schedules.find((item) => item.id === menu.scheduleId)
    : undefined;

  function toggleSort(column: SortColumn) {
    closeMenu();
    setSort((current) => {
      if (!current || current.column !== column) {
        return { column, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { column, direction: "desc" };
      }
      return null;
    });
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-xs">
      <div
        className={`grid ${SCHEDULE_COLS} shrink-0 gap-x-3 border-b border-border-subtle bg-surface-muted/70 px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted`}
      >
        <SortHeader
          className="pl-9"
          label="Application"
          active={sort?.column === "app" ? sort.direction : null}
          onClick={() => toggleSort("app")}
        />
        <SortHeader
          label="When"
          active={sort?.column === "when" ? sort.direction : null}
          onClick={() => toggleSort("when")}
        />
        <SortHeader
          label="Mode"
          active={sort?.column === "mode" ? sort.direction : null}
          onClick={() => toggleSort("mode")}
        />
        <SortHeader
          label="Notification"
          active={sort?.column === "notify" ? sort.direction : null}
          onClick={() => toggleSort("notify")}
        />
        <SortHeader
          label="Status"
          active={sort?.column === "status" ? sort.direction : null}
          onClick={() => toggleSort("status")}
        />
        <span aria-hidden />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
        onDragStart={closeMenu}
      >
        <SortableContext
          items={displayedSchedules.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {displayedSchedules.map((item) => (
              <ScheduleRow
                key={item.id}
                schedule={item}
                reorderEnabled={!sort}
                menuOpen={menu?.scheduleId === item.id}
                onToggleMenu={toggleMenu}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {menu && menuSchedule ? (
        <RowActionsMenu
          menu={menu}
          schedule={menuSchedule}
          onClose={closeMenu}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePause={onTogglePause}
          onCancelUpcoming={onCancelUpcoming}
        />
      ) : null}
    </div>
  );
}

function SortHeader({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: SortDirection | null;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-0 items-center justify-between gap-1.5 text-left transition-colors duration-fast hover:text-text-primary",
        className,
      )}
      title={
        active === null
          ? `Sort by: ${label}`
          : active === "asc"
            ? `Sorted by ${label}: A to Z. Click for reverse order`
            : `Sorted by ${label}: Z to A. Click to clear sorting`
      }
    >
      <span className="truncate">{label}</span>
      <span
        aria-hidden
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors duration-fast",
          active ? "text-text-primary" : "text-text-muted/55",
        )}
      >
        {active === "asc" ? (
          <IconSortAsc className="size-4" />
        ) : active === "desc" ? (
          <IconSortDesc className="size-4" />
        ) : (
          <IconSort className="size-4" />
        )}
      </span>
    </button>
  );
}

function compareSchedules(left: Schedule, right: Schedule, sort: NonNullable<SortState>) {
  const direction = sort.direction === "asc" ? 1 : -1;
  return compareText(getSortValue(left, sort.column), getSortValue(right, sort.column)) * direction;
}

function getSortValue(schedule: Schedule, column: SortColumn): string {
  switch (column) {
    case "app":
      return `${schedule.appName} ${schedule.appPath}`;
    case "when":
      return `${formatWhenPrimary(schedule)} ${formatWhenSecondary(schedule) ?? ""}`;
    case "mode":
      return MODE_LABEL[schedule.mode];
    case "notify":
      return NOTIFY_LABEL[schedule.notify];
    case "status":
      return STATUS_LABEL[getDisplayStatus(schedule)];
  }
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "en", { sensitivity: "base", numeric: true });
}
