import { useCallback, useEffect, useState } from "react";
import type { AppTargetInfo } from "../../apps/types";
import { isTauriRuntime } from "../../apps/api";
import { createSequence, updateSequence } from "../lib/buildSequence";
import { refreshSequencesHealth, resolveSequenceSteps } from "../lib/health";
import { reorderByIndex } from "../lib/ids";
import { loadSequences, runSequenceNow, saveSequences } from "../storage/sequenceRepository";
import type { Sequence, SequenceFormValues } from "../types";

export function useSequences() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [ready, setReady] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const persist = useCallback(async (next: Sequence[]) => {
    setSequences(next);
    await saveSequences(next);
  }, []);

  const revalidate = useCallback(async () => {
    const current = await loadSequences();
    const refreshed = await refreshSequencesHealth(current);
    await persist(refreshed);
    setReady(true);
  }, [persist]);

  useEffect(() => {
    void revalidate();

    function onFocus() {
      void revalidate();
    }

    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [revalidate]);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setSequences((prev) => {
      const next = reorderByIndex(prev, fromIndex, toIndex);
      void saveSequences(next);
      return next;
    });
  }, []);

  const create = useCallback(
    async (values: SequenceFormValues, trigger: AppTargetInfo) => {
      const steps = await resolveSequenceSteps(values.steps);
      const item = createSequence(values, trigger, steps);
      setSequences((prev) => {
        const next = [...prev, item];
        void saveSequences(next);
        return next;
      });
      return item;
    },
    [],
  );

  const update = useCallback(
    async (id: string, values: SequenceFormValues, trigger: AppTargetInfo) => {
      const steps = await resolveSequenceSteps(values.steps);
      setSequences((prev) => {
        const next = prev.map((item) =>
          item.id === id ? updateSequence(item, values, trigger, steps) : item,
        );
        void saveSequences(next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setSequences((prev) => {
      const next = prev.filter((item) => item.id !== id);
      void saveSequences(next);
      return next;
    });
  }, []);

  const togglePause = useCallback((id: string) => {
    setSequences((prev) => {
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          enabled: !item.enabled,
          updatedAt: new Date().toISOString(),
        };
      });
      void saveSequences(next);
      return next;
    });
  }, []);

  const runNow = useCallback(async (id: string) => {
    if (!isTauriRuntime()) return;
    setRunningId(id);
    try {
      await runSequenceNow(id);
    } finally {
      setRunningId(null);
    }
  }, []);

  return {
    sequences,
    ready,
    runningId,
    create,
    update,
    remove,
    reorder,
    togglePause,
    runNow,
    revalidate,
  };
}
