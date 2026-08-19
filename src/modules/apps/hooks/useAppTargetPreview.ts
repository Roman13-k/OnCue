import { useEffect, useState } from "react";
import { looksLikeUrl, resolveAppTarget } from "../api";
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
      const isUrl = looksLikeUrl(trimmed);
      void resolveAppTarget(trimmed, { fetchIcon: !isUrl })
        .then(async (info) => {
          if (cancelled) return;
          setState({ status: "ready", info });

          if (!isUrl || info.iconDataUrl) return;
          try {
            const withIcon = await resolveAppTarget(trimmed, { fetchIcon: true });
            if (!cancelled && withIcon.iconDataUrl) {
              setState({ status: "ready", info: withIcon });
            }
          } catch {
            // Keep icon-less preview; network failures must not block the form.
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message =
            err instanceof Error
              ? err.message
              : typeof err === "string"
                ? err
                : "Couldn’t verify path";
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
