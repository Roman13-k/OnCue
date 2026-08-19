import { useMemo, useState } from "react";
import type { AppTargetInfo } from "../modules/apps/types";
import { useBootLauncher } from "../modules/launcher";
import { SuggestionsPanel, useHabitSuggestions } from "../modules/ml";
import { SettingsModal, useSettings } from "../modules/settings";
import { AppShell } from "./layout/AppShell";
import { ScheduleFormPanel, ScheduleList, useSchedules } from "../modules/schedules";
import { scheduleToFormValues } from "../modules/schedules/lib/formValues";
import type { PanelState, Schedule, ScheduleFormValues } from "../modules/schedules/types";
import { AppHeader, type AppViewMode } from "../modules/shell";

export function App() {
  const [mode, setMode] = useState<AppViewMode>("schedules");
  const [panel, setPanel] = useState<PanelState>({ kind: "closed" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { schedules, ready, create, update, remove, reorder, togglePause, cancelUpcoming } =
    useSchedules();
  const {
    suggestions,
    loading: suggestionsLoading,
    error: suggestionsError,
    refresh: refreshSuggestions,
    toggleAutostart,
  } = useHabitSuggestions();
  const {
    launchOnStartup,
    loading: settingsLoading,
    saving: settingsSaving,
    error: settingsError,
    setLaunchOnStartup,
  } = useSettings(settingsOpen);

  useBootLauncher(schedules, ready);

  const panelOpen = panel.kind !== "closed" && mode === "schedules";

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

  function handleModeChange(next: AppViewMode) {
    setMode(next);
    if (next !== "schedules") {
      setPanel({ kind: "closed" });
    }
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
    <>
      <AppShell
        header={
          <AppHeader
            mode={mode}
            onModeChange={handleModeChange}
            scheduleCount={schedules.length}
            suggestionCount={suggestions.length}
            panelOpen={panelOpen}
            settingsOpen={settingsOpen}
            onAdd={openCreate}
            onOpenSettings={() => {
              setSettingsOpen((open) => !open);
            }}
          />
        }
        main={
          mode === "schedules" ? (
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
          ) : (
            <SuggestionsPanel
              suggestions={suggestions}
              loading={suggestionsLoading}
              error={suggestionsError}
              onRefresh={() => {
                void refreshSuggestions();
              }}
              onToggleAutostart={(item, enabled) => {
                void toggleAutostart(item, enabled);
              }}
            />
          )
        }
        side={panelOpen ? renderForm("side") : undefined}
        overlay={
          panelOpen ? (
            <div className="fixed inset-0 z-40 flex justify-end overflow-hidden bg-text-primary/15 backdrop-blur-[2px] xl:hidden">
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Close panel"
                onClick={closePanel}
              />
              <div className="relative h-full w-full max-w-md overflow-hidden border-l border-border shadow-lg">
                {renderForm("overlay")}
              </div>
            </div>
          ) : undefined
        }
      />
      <SettingsModal
        open={settingsOpen}
        launchOnStartup={launchOnStartup}
        loading={settingsLoading}
        saving={settingsSaving}
        error={settingsError}
        onClose={() => {
          setSettingsOpen(false);
        }}
        onLaunchOnStartupChange={(enabled) => {
          void setLaunchOnStartup(enabled);
        }}
      />
    </>
  );
}
