import { useEffect, useRef } from "react";
import type { Schedule } from "../../schedules/types";
import { isAutostartSession, runBootLaunches } from "../api";

/**
 * After schedules are health-checked, launch boot-mode apps once
 * if this process was started by Windows login (--autostart).
 */
export function useBootLauncher(schedules: Schedule[], ready: boolean) {
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;

    let cancelled = false;

    void (async () => {
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
        .map((item) => ({ id: item.id, path: item.appPath }));

      if (targets.length === 0) {
        started.current = true;
        return;
      }

      started.current = true;
      const results = await runBootLaunches(targets);
      for (const result of results) {
        if (!result.ok) {
          console.warn("[OnCue] boot launch failed:", result.path, result.error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, schedules]);
}
