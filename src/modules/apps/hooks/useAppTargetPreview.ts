import { useEffect, useState } from "react";
import { resolveAppTarget } from "../api";
import type { AppTargetPreviewState } from "../types";

const DEBOUNCE_MS = 320;

export function useAppTargetPreview(path: string): AppTargetPreviewState {
  const [state, setState] = useState<AppTargetPreviewState>({ status: "idle" });

  useEffect(() => {
    const trimmed = path.trim();
    if (!trimmed) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    const timer = window.setTimeout(() => {
      void resolveAppTarget(trimmed)
        .then((info) => {
          if (!cancelled) setState({ status: "ready", info });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message =
            err instanceof Error
              ? err.message
              : typeof err === "string"
                ? err
                : "Не удалось проверить путь";
          setState({ status: "error", message });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [path]);

  return state;
}
