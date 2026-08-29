import type { AppTargetInfo } from "../../../apps/types";
import { useEffect, useId, useState, type ReactNode } from "react";
import { AppTargetPreview, pickAppFile, useAppTargetPreview } from "../../../apps";
import { CheckboxField } from "../../../../shared/ui/Checkbox";
import { IconClose, IconFolder, IconPlus, IconTrash } from "../../../../shared/ui/icons";
import { DEFAULT_SEQUENCE_FORM } from "../../lib/formValues";
import { createId, reorderByIndex } from "../../lib/ids";
import type { SequenceFormValues, SequenceStepFormValues } from "../../types";

type SequenceFormPanelProps = {
  mode: "create" | "edit";
  initialValues?: SequenceFormValues;
  triggerIconDataUrl?: string | null;
  stepIcons?: Record<string, string | null>;
  onClose: () => void;
  onSubmit: (values: SequenceFormValues, trigger: AppTargetInfo) => void | Promise<void>;
};

function emptyStep(): SequenceStepFormValues {
  return {
    id: createId("step"),
    appPath: "",
  };
}

export function SequenceFormPanel({
  mode,
  initialValues,
  triggerIconDataUrl,
  stepIcons,
  onClose,
  onSubmit,
}: SequenceFormPanelProps) {
  const [values, setValues] = useState<SequenceFormValues>(
    () => initialValues ?? DEFAULT_SEQUENCE_FORM,
  );
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formId = useId();
  const triggerPreview = useAppTargetPreview(values.triggerPath);

  useEffect(() => {
    setValues(initialValues ?? DEFAULT_SEQUENCE_FORM);
    setBrowseError(null);
    setFormError(null);
  }, [initialValues, mode]);

  function patch(partial: Partial<SequenceFormValues>) {
    setValues((prev) => ({ ...prev, ...partial }));
    setFormError(null);
  }

  function patchStep(stepId: string, partial: Partial<SequenceStepFormValues>) {
    setValues((prev) => ({
      ...prev,
      steps: prev.steps.map((step) => (step.id === stepId ? { ...step, ...partial } : step)),
    }));
    setFormError(null);
  }

  async function onBrowse(target: "trigger" | string) {
    setBrowseError(null);
    setBrowsing(target);
    try {
      const selected = await pickAppFile();
      if (!selected) return;
      if (target === "trigger") {
        patch({ triggerPath: selected });
      } else {
        patchStep(target, { appPath: selected });
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Couldn't open the file picker";
      setBrowseError(message);
    } finally {
      setBrowsing(null);
    }
  }

  async function handleSave() {
    if (!values.name.trim()) {
      setFormError("Enter a sequence name");
      return;
    }
    if (triggerPreview.status === "loading") {
      setFormError("Please wait — verifying the trigger app…");
      return;
    }
    if (triggerPreview.status !== "ready") {
      setFormError(
        triggerPreview.status === "error"
          ? triggerPreview.message
          : "Choose a valid trigger application",
      );
      return;
    }

    setSaving(true);
    try {
      await onSubmit(values, triggerPreview.info);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "create" ? "New sequence" : "Edit sequence";

  return (
    <aside className="panel-enter flex h-full min-h-0 w-full flex-col overflow-hidden bg-surface-elevated">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-text-primary">{title}</h2>
          <p className="text-xs text-text-muted">When the trigger opens, companions launch automatically</p>
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
        <Field label="Name" htmlFor={`${formId}-name`}>
          <input
            id={`${formId}-name`}
            type="text"
            value={values.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Gaming session"
            className="w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-text-primary shadow-xs placeholder:text-text-muted focus:border-accent"
          />
        </Field>

        <Field label="Trigger app" htmlFor={`${formId}-trigger`}>
          <div className="flex gap-2">
            <input
              id={`${formId}-trigger`}
              type="text"
              value={values.triggerPath}
              onChange={(e) => patch({ triggerPath: e.target.value })}
              placeholder="Path to .exe — launches this first"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-text-primary shadow-xs placeholder:text-text-muted focus:border-accent"
            />
            <button
              type="button"
              onClick={() => void onBrowse("trigger")}
              disabled={browsing !== null}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-2.5 py-2 text-sm font-medium text-text-secondary shadow-xs transition-colors duration-fast hover:bg-surface-hover disabled:cursor-wait disabled:opacity-60"
            >
              <IconFolder />
              {browsing === "trigger" ? "…" : "Browse"}
            </button>
          </div>
          <AppTargetPreview state={triggerPreview} iconFallback={triggerIconDataUrl} />
        </Field>

        <Field label="Exceptions">
          <div className="space-y-2.5 rounded-lg border border-border-subtle bg-surface px-3 py-3">
            <CheckboxField
              checked={values.skipOnBattery}
              onChange={(skipOnBattery) => patch({ skipOnBattery })}
              title="Skip on battery"
              hint="Do not launch companions while unplugged"
            />
            <CheckboxField
              checked={values.isGame}
              onChange={(isGame) => patch({ isGame })}
              title="This is a game"
              hint="While the trigger is running, blocks other scheduled launches"
            />
          </div>
        </Field>

        <Field label="Companion apps">
          <div className="space-y-2">
            {values.steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                total={values.steps.length}
                browsing={browsing === step.id}
                onBrowse={() => void onBrowse(step.id)}
                onPatch={(partial) => patchStep(step.id, partial)}
                onRemove={() =>
                  patch({ steps: values.steps.filter((item) => item.id !== step.id) })
                }
                onMoveUp={() => {
                  if (index === 0) return;
                  patch({ steps: reorderByIndex(values.steps, index, index - 1) });
                }}
                onMoveDown={() => {
                  if (index >= values.steps.length - 1) return;
                  patch({ steps: reorderByIndex(values.steps, index, index + 1) });
                }}
                iconFallback={stepIcons?.[step.id] ?? null}
              />
            ))}
            <button
              type="button"
              onClick={() => patch({ steps: [...values.steps, emptyStep()] })}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors duration-fast hover:border-border-strong hover:bg-surface-hover"
            >
              <IconPlus className="size-4" />
              Add companion
            </button>
          </div>
        </Field>

        {browseError ? (
          <p role="alert" className="text-xs text-danger">
            {browseError}
          </p>
        ) : null}
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
          disabled={saving || triggerPreview.status === "loading"}
          onClick={() => void handleSave()}
          className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-text-inverse shadow-sm transition-colors duration-fast hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mode === "create" ? "Save" : "Update"}
        </button>
      </div>
    </aside>
  );
}

function StepCard({
  step,
  index,
  total,
  browsing,
  onBrowse,
  onPatch,
  onRemove,
  onMoveUp,
  onMoveDown,
  iconFallback,
}: {
  step: SequenceStepFormValues;
  index: number;
  total: number;
  browsing: boolean;
  onBrowse: () => void;
  onPatch: (partial: Partial<SequenceStepFormValues>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  iconFallback?: string | null;
}) {
  const preview = useAppTargetPreview(step.appPath);

  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Step {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="cursor-pointer rounded px-1.5 py-0.5 text-xs text-text-muted hover:bg-surface-muted disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={index >= total - 1}
            onClick={onMoveDown}
            className="cursor-pointer rounded px-1.5 py-0.5 text-xs text-text-muted hover:bg-surface-muted disabled:opacity-40"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove step"
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-text-muted hover:bg-danger-soft hover:text-danger"
          >
            <IconTrash className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={step.appPath}
          onChange={(e) => onPatch({ appPath: e.target.value })}
          placeholder="Companion app path"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-2.5 py-2 text-sm text-text-primary shadow-xs placeholder:text-text-muted focus:border-accent"
        />
        <button
          type="button"
          onClick={onBrowse}
          disabled={browsing}
          className="inline-flex shrink-0 cursor-pointer items-center rounded-md border border-border bg-surface-elevated px-2.5 py-2 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-60"
        >
          <IconFolder />
        </button>
      </div>
      <AppTargetPreview state={preview} iconFallback={iconFallback} />
    </div>
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
