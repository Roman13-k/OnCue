import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { AppTargetInfo } from "../../apps/types";
import { isTauriRuntime } from "../../apps/api";
import { createSchedule, updateSchedule } from "../lib/buildSchedule";
import { refreshSchedulesHealth } from "../lib/health";
import { reorderByIndex } from "../lib/ids";
import { loadSchedules, saveSchedules, cancelUpcomingLaunch } from "../storage/scheduleRepository";
import type { Schedule, ScheduleFormValues } from "../types";

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [ready, setReady] = useState(false);

  const persist = useCallback(async (next: Schedule[]) => {
    setSchedules(next);
    await saveSchedules(next);
  }, []);

  const revalidate = useCallback(async () => {
    const current = await loadSchedules();
    const refreshed = await refreshSchedulesHealth(current);
    await persist(refreshed);
    setReady(true);
  }, [persist]);

  useEffect(() => {
    void revalidate();

    function onFocus() {
      void revalidate();
    }

    window.addEventListener("focus", onFocus);

    let unlisten: (() => void) | undefined;
    if (isTauriRuntime()) {
      void listen("schedules-updated", () => {
        void revalidate();
      }).then((dispose) => {
        unlisten = dispose;
      });
    }

    return () => {
      window.removeEventListener("focus", onFocus);
      unlisten?.();
    };
  }, [revalidate]);

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      setSchedules((prev) => {
        const next = reorderByIndex(prev, fromIndex, toIndex);
        void saveSchedules(next);
        return next;
      });
    },
    [],
  );

  const create = useCallback((values: ScheduleFormValues, app: AppTargetInfo) => {
    const item = createSchedule(values, app);
    setSchedules((prev) => {
      const next = [...prev, item];
      void saveSchedules(next);
      return next;
    });
    return item;
  }, []);

  const update = useCallback(
    (id: string, values: ScheduleFormValues, app: AppTargetInfo) => {
      setSchedules((prev) => {
        const next = prev.map((item) =>
          item.id === id ? updateSchedule(item, values, app) : item,
        );
        void saveSchedules(next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setSchedules((prev) => {
      const next = prev.filter((item) => item.id !== id);
      void saveSchedules(next);
      return next;
    });
  }, []);

  const togglePause = useCallback((id: string) => {
    setSchedules((prev) => {
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          enabled: !item.enabled,
          updatedAt: new Date().toISOString(),
        };
      });
      void saveSchedules(next);
      return next;
    });
  }, []);

  const cancelUpcoming = useCallback(
    async (id: string) => {
      await cancelUpcomingLaunch(id);
      await revalidate();
    },
    [revalidate],
  );

  return {
    schedules,
    ready,
    create,
    update,
    remove,
    reorder,
    togglePause,
    cancelUpcoming,
    revalidate,
  };
}
