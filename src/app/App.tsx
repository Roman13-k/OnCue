import { useMemo, useState } from "react";
import type { AppTargetInfo } from "../modules/apps/types";
import { useBootLauncher } from "../modules/launcher";
import { AppShell } from "./layout/AppShell";
import { ScheduleFormPanel, ScheduleList, useSchedules } from "../modules/schedules";
import { scheduleToFormValues } from "../modules/schedules/lib/formValues";
import type { PanelState, Schedule, ScheduleFormValues } from "../modules/schedules/types";
import { AppHeader } from "../modules/shell";

export function App() {
  const [panel, setPanel] = useState<PanelState>({ kind: "closed" });
  const { schedules, ready, create, update, remove, reorder, togglePause, cancelUpcoming } =
    useSchedules();

  useBootLauncher(schedules, ready);

  const panelOpen = panel.kind !== "closed";

  const editingSchedule = useMemo(() => {
    if (panel.kind !== "edit") return undefined;
    return schedules.find((item) => item.id === panel.scheduleId);
  }, [panel, schedules]);

  function closePanel() {
    setPanel({ kind: "closed" });
  }

  function openCreate() {
    setPanel((prev) => (prev.kind === "create" ? { kind: "closed" } : { kind: "create" }));
  }

  function openCreateFromEmpty() {
    setPanel({ kind: "create" });
  }

  function openEdit(schedule: Schedule) {
    setPanel({ kind: "edit", scheduleId: schedule.id });
  }

  function handleSubmit(values: ScheduleFormValues, app: AppTargetInfo) {
    if (panel.kind === "edit") {
      update(panel.scheduleId, values, app);
      return;
    }
    create(values, app);
  }

  function renderForm(instanceKey: string) {
    if (panel.kind === "create") {
      return (
        <ScheduleFormPanel
          key={`${instanceKey}-create`}
          mode="create"
          schedules={schedules}
          onClose={closePanel}
          onSubmit={handleSubmit}
        />
      );
    }
    if (panel.kind === "edit" && editingSchedule) {
      return (
        <ScheduleFormPanel
          key={`${instanceKey}-${editingSchedule.id}`}
          mode="edit"
          schedules={schedules}
          editingScheduleId={editingSchedule.id}
          initialValues={scheduleToFormValues(editingSchedule)}
          onClose={closePanel}
          onSubmit={handleSubmit}
        />
      );
    }
    return null;
  }

  return (
    <AppShell
      header={
        <AppHeader
          scheduleCount={schedules.length}
          panelOpen={panelOpen}
          onAdd={openCreate}
        />
      }
      main={
        <ScheduleList
          schedules={schedules}
          onReorder={reorder}
          onCreate={openCreateFromEmpty}
          onEdit={openEdit}
          onDelete={(schedule) => {
            remove(schedule.id);
            if (panel.kind === "edit" && panel.scheduleId === schedule.id) {
              closePanel();
            }
          }}
          onTogglePause={(schedule) => togglePause(schedule.id)}
          onCancelUpcoming={(schedule) => {
            void cancelUpcoming(schedule.id);
          }}
        />
      }
      side={panelOpen ? renderForm("side") : undefined}
      overlay={
        panelOpen ? (
          <div className="fixed inset-0 z-40 flex justify-end overflow-hidden bg-text-primary/15 backdrop-blur-[2px] xl:hidden">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="Закрыть панель"
              onClick={closePanel}
            />
            <div className="relative h-full w-full max-w-md overflow-hidden border-l border-border shadow-lg">
              {renderForm("overlay")}
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
