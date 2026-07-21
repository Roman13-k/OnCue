import { IconApp } from "../../../shared/ui/icons";
import type { AppTargetPreviewState } from "../types";

type AppTargetPreviewProps = {
  state: AppTargetPreviewState;
};

export function AppTargetPreview({ state }: AppTargetPreviewProps) {
  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2.5">
        <div className="size-9 shrink-0 animate-pulse rounded-md bg-surface-muted" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3.5 w-28 animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-40 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="mt-2 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger"
      >
        {state.message}
      </div>
    );
  }

  const { info } = state;

  return (
    <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 shadow-xs">
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-muted text-text-secondary">
        {info.iconDataUrl ? (
          <img
            src={info.iconDataUrl}
            alt=""
            className="size-7 object-contain"
            draggable={false}
          />
        ) : (
          <IconApp />
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-text-primary">{info.name}</div>
        <div className="mt-0.5 truncate text-xs text-text-muted">{info.path}</div>
      </div>
    </div>
  );
}
