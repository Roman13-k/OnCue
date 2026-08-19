import { cn } from "../../../shared/lib/cn";
import { Checkbox } from "../../../shared/ui/Checkbox";
import { IconApp, IconRefresh } from "../../../shared/ui/icons";
import type { HabitSuggestion } from "../api";

const SUGGEST_COLS =
  "grid-cols-[2.5rem_minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(7.5rem,11rem)]";

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type SuggestionsPanelProps = {
  suggestions: HabitSuggestion[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onToggleAutostart: (item: HabitSuggestion, enabled: boolean) => void;
};

export function SuggestionsPanel({
  suggestions,
  loading,
  error,
  onRefresh,
  onToggleAutostart,
}: SuggestionsPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-xs">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text-primary">Suggestions</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            {loading
              ? "Calculating probabilities…"
              : error
                ? "Couldn’t refresh"
                : suggestions.length === 0
                  ? "Not enough data"
                  : `${suggestions.length} ${pluralSuggestions(suggestions.length)} · today`}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors duration-fast hover:bg-surface-hover hover:text-text-primary disabled:opacity-55"
        >
          <IconRefresh className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="max-w-md text-sm text-text-secondary">{error}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="text-sm font-medium text-accent-fg hover:underline"
          >
            Try again
          </button>
        </div>
      ) : loading && suggestions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-sm text-text-muted">Loading…</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-text-primary">No suggestions</p>
          <p className="max-w-sm text-xs text-text-muted">
            Not enough launch history for upcoming times today. Keep OnCue running and check
            back later.
          </p>
        </div>
      ) : (
        <>
          <div
            className={`grid ${SUGGEST_COLS} shrink-0 gap-x-3 border-b border-border-subtle bg-surface-muted/70 px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted`}
          >
            <span className="text-center">Auto</span>
            <span>Name</span>
            <span>Path</span>
            <span>Probability</span>
          </div>
          <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {suggestions.map((item) => (
              <SuggestionRow
                key={item.id}
                item={item}
                onToggleAutostart={onToggleAutostart}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

type SuggestionRowProps = {
  item: HabitSuggestion;
  onToggleAutostart: (item: HabitSuggestion, enabled: boolean) => void;
};

function SuggestionRow({ item, onToggleAutostart }: SuggestionRowProps) {
  const pct = Math.round(item.confidence * 100);
  const day = WEEKDAY_SHORT[item.weekday] ?? String(item.weekday);

  return (
    <li className="border-b border-border-subtle last:border-b-0">
      <div
        className={cn(
          `grid ${SUGGEST_COLS} w-full items-center gap-x-3 px-3 py-3 transition-colors duration-fast hover:bg-surface-hover/80`,
          item.autostartEnabled &&
            "bg-success-soft/35 ring-1 ring-inset ring-success/55 hover:bg-success-soft/45",
        )}
      >
        <div className="flex items-center justify-center">
          <Checkbox
            checked={item.autostartEnabled}
            onChange={(event) => {
              onToggleAutostart(item, event.target.checked);
            }}
            aria-label={`Autostart ${item.app} at ${item.from}`}
          />
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-muted text-text-secondary">
            {item.iconDataUrl ? (
              <img
                src={item.iconDataUrl}
                alt=""
                className="size-7 object-contain"
                draggable={false}
              />
            ) : (
              <IconApp />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-text-primary">{item.app}</div>
            <div className="mt-0.5 truncate text-xs text-text-muted">
              {day} · {item.from}–{item.to}
            </div>
          </div>
        </div>

        <div className="min-w-0 truncate font-mono text-xs text-text-secondary" title={item.appPath}>
          {item.appPath || "—"}
        </div>

        <div className="min-w-0">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold tabular-nums text-text-primary">{pct}%</span>
            <span className="text-[11px] text-text-muted">confidence</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Probability ${pct} percent`}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-normal ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

function pluralSuggestions(n: number): string {
  return n === 1 ? "suggestion" : "suggestions";
}
