import { useEffect } from "react";
import { CheckboxField } from "../../../shared/ui/Checkbox";
import { IconClose } from "../../../shared/ui/icons";

type SettingsModalProps = {
  open: boolean;
  launchOnStartup: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onLaunchOnStartupChange: (enabled: boolean) => void;
};

export function SettingsModal({
  open,
  launchOnStartup,
  loading,
  saving,
  error,
  onClose,
  onLaunchOnStartupChange,
}: SettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-text-primary/15 backdrop-blur-[2px]"
        aria-label="Close settings"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="panel-enter relative flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-lg"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <div className="min-w-0">
            <h2 id="settings-title" className="text-base font-semibold text-text-primary">
              Settings
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {loading ? "Loading…" : "General application options"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors duration-fast hover:bg-surface-muted hover:text-text-primary"
          >
            <IconClose />
          </button>
        </div>

        <div className="px-4 py-4">
          {error ? (
            <p role="alert" className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <section className="rounded-lg border border-border-subtle bg-surface px-4 py-3.5">
            <h3 className="text-sm font-semibold text-text-primary">Startup</h3>
            <div className="mt-3">
              <CheckboxField
                checked={launchOnStartup}
                disabled={loading || saving}
                onChange={(enabled) => {
                  void onLaunchOnStartupChange(enabled);
                }}
                title="Launch OnCue when Windows starts"
                hint="Keeps the scheduler running in the background after sign-in"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
