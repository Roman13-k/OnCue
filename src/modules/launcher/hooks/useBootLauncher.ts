import { useEffect, useRef } from "react";
import type { Schedule } from "../../schedules/types";
import { isAutostartSession, runBootLaunches } from "../api";

const BOOT_RETRY_MS = 30_000;

export function useBootLauncher(schedules: Schedule[], ready: boolean) {
  const done = useRef(false);

  useEffect(() => {
    if (!ready || done.current) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const attempt = async () => {
      const autostart = await isAutostartSession();
      if (!autostart || cancelled) return;

      const targets = schedules
        .filter(
          (item) =>
            item.mode === "boot" &&
            item.enabled &&
            item.health === "ok" &&
            item.appPath.trim().length > 0,
        )
        .map((item) => ({ id: item.id }));

      if (targets.length === 0) {
        done.current = true;
        return;
      }

      const { results, blocked } = await runBootLaunches(targets);
      for (const result of results) {
        if (!result.ok) {
          console.warn("[OnCue] boot launch failed:", result.path, result.error);
        }
      }

      if (cancelled) return;

      if (blocked > 0) {
        retryTimer = setTimeout(() => {
          void attempt();
        }, BOOT_RETRY_MS);
        return;
      }

      done.current = true;
    };

    void attempt();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) {
        clearTimeout(retryTimer);
      }
    };
  }, [ready, schedules]);
}
