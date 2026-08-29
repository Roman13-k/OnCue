import { OnCueLogo } from "../../../shared/brand/OnCueLogo";
import { cn } from "../../../shared/lib/cn";
import { IconPlus, IconSettings } from "../../../shared/ui/icons";

export type AppViewMode = "schedules" | "sequences" | "suggestions";

type AppHeaderProps = {
  mode: AppViewMode;
  onModeChange: (mode: AppViewMode) => void;
  scheduleCount: number;
  sequenceCount: number;
  suggestionCount: number;
  panelOpen: boolean;
  settingsOpen: boolean;
  onAdd?: () => void;
  onOpenSettings: () => void;
};

export function AppHeader({
  mode,
  onModeChange,
  scheduleCount,
  sequenceCount,
  suggestionCount,
  panelOpen,
  settingsOpen,
  onAdd,
  onOpenSettings,
}: AppHeaderProps) {
  const subtitle = (() => {
    if (mode === "schedules") {
      return scheduleCount === 0
        ? "No schedules yet"
        : `${scheduleCount} ${pluralSchedules(scheduleCount)} · drag rows to reorder`;
    }
    if (mode === "sequences") {
      return sequenceCount === 0
        ? "Launch companions when a trigger app opens"
        : `${sequenceCount} ${pluralSequences(sequenceCount)} · watcher active`;
    }
    return suggestionCount === 0
      ? "Suggestions based on launch habits"
      : `${suggestionCount} ${pluralSuggestions(suggestionCount)} · higher probability ranks higher`;
  })();

  return (
    <header className="flex shrink-0 flex-col gap-4 border-b border-border-subtle pb-4">
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-3">
          <OnCueLogo className="size-9" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-text-primary">OnCue</h1>
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <span className="size-1.5 rounded-full bg-success" aria-hidden />
                Scheduler running
              </span>
            </div>
            <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-pressed={settingsOpen}
            aria-label="Settings"
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-lg border transition-colors duration-fast",
              settingsOpen
                ? "border-accent/35 bg-accent-soft text-accent-fg"
                : "border-border-subtle bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary",
            )}
          >
            <IconSettings className="size-4" />
          </button>
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              aria-pressed={panelOpen}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-fast",
                panelOpen
                  ? "bg-accent-soft text-accent-fg shadow-xs"
                  : "bg-accent text-text-inverse shadow-sm hover:bg-accent-hover",
              )}
            >
              <IconPlus className="opacity-90" />
              {mode === "sequences" ? "Add sequence" : "Add autostart"}
            </button>
          ) : null}
        </div>
      </div>
      <div
        role="tablist"
        aria-label="Sections"
        className="inline-flex w-fit rounded-lg border border-border-subtle bg-surface-muted p-0.5"
      >
        <ModeTab
          active={mode === "schedules"}
          onClick={() => onModeChange("schedules")}
          label="Schedules"
        />
        <ModeTab
          active={mode === "sequences"}
          onClick={() => onModeChange("sequences")}
          label="Sequences"
        />
        <ModeTab
          active={mode === "suggestions"}
          onClick={() => onModeChange("suggestions")}
          label="Suggestions"
        />
      </div>
    </header>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-fast",
        active
          ? "bg-surface-elevated text-text-primary shadow-xs"
          : "text-text-muted hover:text-text-secondary",
      )}
    >
      {label}
    </button>
  );
}

function pluralSchedules(n: number): string {
  return n === 1 ? "schedule" : "schedules";
}

function pluralSequences(n: number): string {
  return n === 1 ? "sequence" : "sequences";
}

function pluralSuggestions(n: number): string {
  return n === 1 ? "suggestion" : "suggestions";
}
