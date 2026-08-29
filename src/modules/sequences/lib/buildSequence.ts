import type { AppTargetInfo } from "../../apps/types";
import type { Sequence, SequenceFormValues, SequenceStep } from "../types";
import { createId } from "./ids";

export function createSequence(
  values: SequenceFormValues,
  trigger: AppTargetInfo,
  steps: SequenceStep[],
): Sequence {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name: values.name.trim(),
    enabled: true,
    triggerName: trigger.name,
    triggerPath: trigger.path,
    triggerIconDataUrl: trigger.iconDataUrl,
    skipOnBattery: values.skipOnBattery,
    isGame: values.isGame,
    steps,
    cooldownSec: values.cooldownSec,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateSequence(
  existing: Sequence,
  values: SequenceFormValues,
  trigger: AppTargetInfo,
  steps: SequenceStep[],
): Sequence {
  return {
    ...existing,
    name: values.name.trim(),
    triggerName: trigger.name,
    triggerPath: trigger.path,
    triggerIconDataUrl: trigger.iconDataUrl ?? existing.triggerIconDataUrl,
    skipOnBattery: values.skipOnBattery,
    isGame: values.isGame,
    steps,
    cooldownSec: values.cooldownSec,
    updatedAt: new Date().toISOString(),
  };
}
