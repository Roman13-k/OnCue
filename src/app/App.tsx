import { useMemo, useState } from "react";
import { useBootLauncher } from "../modules/launcher";
import { SuggestionsPanel, useHabitSuggestions } from "../modules/ml";
import { SettingsModal, useSettings } from "../modules/settings";
import {
  SequenceFormPanel,
  SequenceList,
  useSequences,
  type Sequence,
  type SequencePanelState,
} from "../modules/sequences";
import { sequenceToFormValues } from "../modules/sequences/lib/formValues";
import { AppShell } from "./layout/AppShell";
import { ScheduleFormPanel, ScheduleList, useSchedules } from "../modules/schedules";
import { scheduleToFormValues } from "../modules/schedules/lib/formValues";
import type { PanelState, ScheduleFormValues } from "../modules/schedules/types";
import { AppHeader, type AppViewMode } from "../modules/shell";

export function App() {
  const [mode, setMode] = useState<AppViewMode>("schedules");
  const [schedulePanel, setSchedulePanel] = useState<PanelState>({ kind: "closed" });
  const [sequencePanel, setSequencePanel] = useState<SequencePanelState>({ kind: "closed" });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { schedules, ready, create, update, remove, reorder, togglePause, cancelUpcoming } =
    useSchedules();
  const {
    sequences,
    create: createSequence,
    update: updateSequence,
    remove: removeSequence,
    togglePause: toggleSequencePause,
  } = useSequences();

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

  const sidePanelOpen =
    mode === "schedules"
      ? schedulePanel.kind !== "closed"
      : mode === "sequences" && sequencePanel.kind !== "closed";

  const editingSchedule = useMemo(() => {
    if (schedulePanel.kind !== "edit") return undefined;
    return schedules.find((item) => item.id === schedulePanel.scheduleId);
  }, [schedulePanel, schedules]);

  const editingSequence = useMemo(() => {
    if (sequencePanel.kind !== "edit") return undefined;
    return sequences.find((item) => item.id === sequencePanel.sequenceId);
  }, [sequencePanel, sequences]);

  function closeSidePanel() {
    setSchedulePanel({ kind: "closed" });
    setSequencePanel({ kind: "closed" });
  }

  function openScheduleCreate() {
    setSchedulePanel((prev) => (prev.kind === "create" ? { kind: "closed" } : { kind: "create" }));
  }

  function openScheduleCreateFromEmpty() {
    setSchedulePanel({ kind: "create" });
  }

  function openScheduleEdit(scheduleId: string) {
    setSchedulePanel({ kind: "edit", scheduleId });
  }

  function openSequenceCreate() {
    setSequencePanel((prev) => (prev.kind === "create" ? { kind: "closed" } : { kind: "create" }));
  }

  function openSequenceCreateFromEmpty() {
    setSequencePanel({ kind: "create" });
  }

  function openSequenceEdit(sequenceId: string) {
    setSequencePanel({ kind: "edit", sequenceId });
  }

  function handleModeChange(next: AppViewMode) {
    setMode(next);
    closeSidePanel();
  }

  function handleScheduleSubmit(values: ScheduleFormValues, app: import("../modules/apps/types").AppTargetInfo) {
    if (schedulePanel.kind === "edit") {
      update(schedulePanel.scheduleId, values, app);
      return;
    }
    create(values, app);
  }

  async function handleSequenceSubmit(
    values: import("../modules/sequences/types").SequenceFormValues,
    trigger: import("../modules/apps/types").AppTargetInfo,
  ) {
    if (sequencePanel.kind === "edit") {
      await updateSequence(sequencePanel.sequenceId, values, trigger);
      return;
    }
    await createSequence(values, trigger);
  }

  function renderSidePanel(instanceKey: string) {
    if (mode === "schedules") {
      if (schedulePanel.kind === "create") {
        return (
          <ScheduleFormPanel
            key={`${instanceKey}-schedule-create`}
            mode="create"
            schedules={schedules}
            onClose={closeSidePanel}
            onSubmit={handleScheduleSubmit}
          />
        );
      }
      if (schedulePanel.kind === "edit" && editingSchedule) {
        return (
          <ScheduleFormPanel
            key={`${instanceKey}-${editingSchedule.id}`}
            mode="edit"
            schedules={schedules}
            editingScheduleId={editingSchedule.id}
            initialValues={scheduleToFormValues(editingSchedule)}
            onClose={closeSidePanel}
            onSubmit={handleScheduleSubmit}
          />
        );
      }
    }

    if (mode === "sequences") {
      if (sequencePanel.kind === "create") {
        return (
          <SequenceFormPanel
            key={`${instanceKey}-sequence-create`}
            mode="create"
            onClose={closeSidePanel}
            onSubmit={handleSequenceSubmit}
          />
        );
      }
      if (sequencePanel.kind === "edit" && editingSequence) {
        const stepIcons = Object.fromEntries(
          editingSequence.steps.map((step) => [step.id, step.iconDataUrl]),
        );
        return (
          <SequenceFormPanel
            key={`${instanceKey}-${editingSequence.id}`}
            mode="edit"
            initialValues={sequenceToFormValues(editingSequence)}
            triggerIconDataUrl={editingSequence.triggerIconDataUrl}
            stepIcons={stepIcons}
            onClose={closeSidePanel}
            onSubmit={handleSequenceSubmit}
          />
        );
      }
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
            sequenceCount={sequences.length}
            suggestionCount={suggestions.length}
            panelOpen={sidePanelOpen}
            settingsOpen={settingsOpen}
            onAdd={
              mode === "sequences"
                ? openSequenceCreate
                : mode === "schedules"
                  ? openScheduleCreate
                  : undefined
            }
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
              onCreate={openScheduleCreateFromEmpty}
              onEdit={(schedule) => openScheduleEdit(schedule.id)}
              onDelete={(schedule) => {
                remove(schedule.id);
                if (schedulePanel.kind === "edit" && schedulePanel.scheduleId === schedule.id) {
                  closeSidePanel();
                }
              }}
              onTogglePause={(schedule) => togglePause(schedule.id)}
              onCancelUpcoming={(schedule) => {
                void cancelUpcoming(schedule.id);
              }}
            />
          ) : mode === "sequences" ? (
            <SequenceList
              sequences={sequences}
              onCreate={openSequenceCreateFromEmpty}
              onEdit={(sequence: Sequence) => openSequenceEdit(sequence.id)}
              onDelete={(sequence: Sequence) => {
                removeSequence(sequence.id);
                if (
                  sequencePanel.kind === "edit" &&
                  sequencePanel.sequenceId === sequence.id
                ) {
                  closeSidePanel();
                }
              }}
              onTogglePause={(sequence: Sequence) => toggleSequencePause(sequence.id)}
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
        side={sidePanelOpen ? renderSidePanel("side") : undefined}
        overlay={
          sidePanelOpen ? (
            <div className="fixed inset-0 z-40 flex justify-end overflow-hidden bg-text-primary/15 backdrop-blur-[2px] xl:hidden">
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Close panel"
                onClick={closeSidePanel}
              />
              <div className="relative h-full w-full max-w-md overflow-hidden border-l border-border shadow-lg">
                {renderSidePanel("overlay")}
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
