import type { AppTargetInfo } from "../../../apps/types";
import { useEffect, useId, useState, type ReactNode } from "react";
import { AppTargetPreview, pickAppFile, useAppTargetPreview } from "../../../apps";
import { cn } from "../../../../shared/lib/cn";
import { CheckboxField } from "../../../../shared/ui/Checkbox";
import { IconCheck, IconClose, IconFolder } from "../../../../shared/ui/icons";
import { TimeField } from "../../../../shared/ui/TimeField";
import { DEFAULT_FORM_VALUES } from "../../lib/formValues";
import { WEEKDAYS } from "../../labels";
import type { Schedule, ScheduleFormValues, ScheduleMode, WeekdayId } from "../../types";

type ScheduleFormPanelProps = {
  mode: "create" | "edit";
  schedules: Schedule[];
  editingScheduleId?: string;
  initialValues?: ScheduleFormValues;
  onClose: () => void;
  onSubmit: (values: ScheduleFormValues, app: AppTargetInfo) => void;
};

const MODE_OPTIONS: { id: ScheduleMode; title: string; hint: string }[] = [
  { id: "always", title: "On schedule", hint: "On selected days within a time range" },
  { id: "once", title: "Once", hint: "Runs at the set time, then turns off" },
  { id: "boot", title: "At PC startup", hint: "Right after the computer turns on" },
];

export function ScheduleFormPanel({
  mode,
  schedules,
  editingScheduleId,
  initialValues,
  onClose,
  onSubmit,
}: ScheduleFormPanelProps) {
  const [values, setValues] = useState<ScheduleFormValues>(
    () => initialValues ?? DEFAULT_FORM_VALUES,
  );
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const formId = useId();
  const preview = useAppTargetPreview(values.appPath);

  const needsSchedule = values.mode === "always" || values.mode === "once";
  const normalizedPath = values.appPath.trim().toLowerCase();
  const hasDuplicateApp =
    normalizedPath.length > 0 &&
    schedules.some(
      (schedule) =>
        schedule.id !== editingScheduleId && schedule.appPath.trim().toLowerCase() === normalizedPath,
    );

  useEffect(() => {
    setValues(initialValues ?? DEFAULT_FORM_VALUES);
    setBrowseError(null);
    setFormError(null);
  }, [initialValues, mode]);

  function patch(partial: Partial<ScheduleFormValues>) {
    setValues((prev) => ({ ...prev, ...partial }));
    setFormError(null);
  }

  function toggleDay(id: WeekdayId) {
    setValues((prev) => {
      const has = prev.dayIds.includes(id);
      return {
        ...prev,
        dayIds: has ? prev.dayIds.filter((d) => d !== id) : [...prev.dayIds, id],
      };
    });
  }

  async function onBrowse() {
    setBrowseError(null);
    setBrowsing(true);
    try {
      const selected = await pickAppFile();
      if (selected) {
        patch({ appPath: selected });
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Couldn’t open the file picker";
      setBrowseError(message);
    } finally {
      setBrowsing(false);
    }
  }

  function handleSave() {
    if (needsSchedule && values.dayIds.length === 0) {
      setFormError("Select at least one weekday");
      return;
    }
    if (preview.status === "loading") {
      setFormError("Please wait — verifying the app path…");
      return;
    }
    if (preview.status !== "ready") {
      setFormError(
        preview.status === "error"
          ? preview.message
          : "Choose an existing application file or website URL",
      );
      return;
    }

    const payload: ScheduleFormValues = needsSchedule
      ? values
      : {
          ...values,
          dayIds: [],
          timeFrom: "00:00",
          timeTo: "00:00",
          notify: "none",
        };

    setSaving(true);
    try {
      onSubmit(payload, preview.info);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "create" ? "New autostart" : "Edit";
  const subtitle =
    mode === "create" ? "App and launch mode" : "Change launch settings";

  return (
    <aside className="panel-enter flex h-full min-h-0 w-full flex-col overflow-hidden bg-surface-elevated">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-text-primary">{title}</h2>
          <p className="text-xs text-text-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors duration-fast hover:bg-surface-muted hover:text-text-primary"
        >
          <IconClose />
        </button>
      </div>
      <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-3.5">
        <Field label="Application" htmlFor={`${formId}-path`}>
          <div className="flex gap-2">
            <input
              id={`${formId}-path`}
              type="text"
              value={values.appPath}
              onChange={(e) => {
                setBrowseError(null);
                patch({ appPath: e.target.value });
              }}
              placeholder="Path to .exe or https://…"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-text-primary shadow-xs placeholder:text-text-muted transition-colors duration-fast hover:border-border-strong focus:border-accent"
            />
            <button
              type="button"
              onClick={() => void onBrowse()}
              disabled={browsing}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-2.5 py-2 text-sm font-medium text-text-secondary shadow-xs transition-colors duration-fast hover:bg-surface-hover disabled:cursor-wait disabled:opacity-60"
            >
              <IconFolder />
              {browsing ? "…" : "Browse"}
            </button>
          </div>
          {browseError ? (
            <p role="alert" className="mt-2 text-xs text-danger">
              {browseError}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-text-muted">
              Pick an app file, or paste a website URL (https://…)
            </p>
          )}

          <AppTargetPreview state={preview} />
          {hasDuplicateApp ? (
            <p className="mt-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This app is already added. You can still save, but the rule will be duplicated.
            </p>
          ) : null}
        </Field>
        <Field label="Launch mode">
          <div role="radiogroup" aria-label="Launch mode" className="space-y-1.5">
            {MODE_OPTIONS.map((opt) => (
              <ModeOption
                key={opt.id}
                title={opt.title}
                hint={opt.hint}
                selected={values.mode === opt.id}
                onSelect={() => patch({ mode: opt.id })}
              />
            ))}
          </div>
        </Field>
        {needsSchedule ? (
          <>
            <Field label="Weekdays">
              <div className="flex flex-wrap gap-1">
                {WEEKDAYS.map((day) => {
                  const selected = values.dayIds.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      aria-pressed={selected}
                      className={cn(
                        "inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-xs font-medium transition-colors duration-fast",
                        selected
                          ? "bg-accent text-text-inverse shadow-xs"
                          : "bg-surface-muted text-text-secondary hover:bg-surface-hover",
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="From" htmlFor={`${formId}-from`}>
                <TimeField
                  id={`${formId}-from`}
                  value={values.timeFrom}
                  onChange={(timeFrom) => patch({ timeFrom })}
                />
              </Field>
              <Field label="To" htmlFor={`${formId}-to`}>
                <TimeField
                  id={`${formId}-to`}
                  value={values.timeTo}
                  onChange={(timeTo) => patch({ timeTo })}
                />
              </Field>
            </div>
            <Field label="Remind">
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: "none", label: "None" },
                    { id: "15m", label: "15 min" },
                    { id: "30m", label: "30 min" },
                    { id: "1h", label: "1 hour" },
                  ] as const
                ).map((opt) => {
                  const selected = values.notify === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => patch({ notify: opt.id })}
                      aria-pressed={selected}
                      className={cn(
                        "cursor-pointer rounded-md px-2 py-1 text-xs font-medium transition-colors duration-fast",
                        selected
                          ? "bg-accent-soft text-accent-fg"
                          : "bg-surface-muted text-text-secondary hover:bg-surface-hover",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </>
        ) : (
          <p className="rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-sm text-text-secondary">
            The app will launch every time the PC starts
          </p>
        )}

        <Field label="Exceptions">
          <div className="space-y-2.5 rounded-lg border border-border-subtle bg-surface px-3 py-3">
            <CheckboxField
              checked={values.skipOnBattery}
              onChange={(skipOnBattery) => patch({ skipOnBattery })}
              title="Skip on battery"
              hint="Do not launch while the laptop is unplugged"
            />
            <CheckboxField
              checked={values.isGame}
              onChange={(isGame) => patch({ isGame })}
              title="This is a game"
              hint="While this app is running, other scheduled launches wait until it closes"
            />
          </div>
        </Field>

        {formError ? (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors duration-fast hover:bg-surface-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving || preview.status === "loading"}
          onClick={handleSave}
          className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-text-inverse shadow-sm transition-colors duration-fast hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mode === "create" ? "Save" : "Update"}
        </button>
      </div>
    </aside>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[0.6875rem] font-medium uppercase tracking-wide text-text-muted"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ModeOption({
  title,
  hint,
  selected,
  onSelect,
}: {
  title: string;
  hint: string;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-fast",
        selected
          ? "border-accent/35 bg-accent-soft/35 shadow-xs"
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover/70",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-[0.3rem] border-2 transition-all duration-fast",
          selected
            ? "border-accent bg-accent text-text-inverse"
            : "border-border-strong bg-surface-elevated",
        )}
        aria-hidden
      >
        {selected ? <IconCheck className="size-3" /> : null}

      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text-primary">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-text-muted">{hint}</span>
      </span>
    </button>
  );
}
