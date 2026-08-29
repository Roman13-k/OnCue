import { looksLikeUrl, resolveAppTarget } from "../../apps/api";
import type { Sequence, SequenceStep, SequenceStepFormValues } from "../types";
import { createId } from "./ids";

export async function resolveSequenceSteps(
  steps: SequenceStepFormValues[],
): Promise<SequenceStep[]> {
  const resolved: SequenceStep[] = [];
  for (const step of steps) {
    const trimmed = step.appPath.trim();
    if (!trimmed) continue;
    const info = await resolveAppTarget(trimmed, { fetchIcon: !looksLikeUrl(trimmed) });
    resolved.push({
      id: step.id || createId("step"),
      appName: info.name,
      appPath: info.path,
      iconDataUrl: info.iconDataUrl,
    });
  }
  return resolved;
}

export async function refreshSequencesHealth(sequences: Sequence[]): Promise<Sequence[]> {
  if (sequences.length === 0) return sequences;

  return Promise.all(
    sequences.map(async (sequence) => {
      try {
        const trigger = await resolveAppTarget(sequence.triggerPath, {
          fetchIcon: !looksLikeUrl(sequence.triggerPath),
        });
        const steps = await Promise.all(
          sequence.steps.map(async (step) => {
            const info = await resolveAppTarget(step.appPath, {
              fetchIcon: !looksLikeUrl(step.appPath),
            });
            return {
              ...step,
              appName: info.name,
              appPath: info.path,
              iconDataUrl: info.iconDataUrl ?? step.iconDataUrl,
            };
          }),
        );
        return {
          ...sequence,
          triggerName: trigger.name,
          triggerPath: trigger.path,
          triggerIconDataUrl: trigger.iconDataUrl ?? sequence.triggerIconDataUrl,
          steps,
        };
      } catch {
        return { ...sequence, enabled: false };
      }
    }),
  );
}
