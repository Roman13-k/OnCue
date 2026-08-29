import type { SequenceFormValues } from "../types";

export const DEFAULT_SEQUENCE_FORM: SequenceFormValues = {
  name: "",
  triggerPath: "",
  skipOnBattery: false,
  isGame: false,
  steps: [],
  cooldownSec: 60,
};

export function sequenceToFormValues(sequence: import("../types").Sequence): SequenceFormValues {
  return {
    name: sequence.name,
    triggerPath: sequence.triggerPath,
    skipOnBattery: sequence.skipOnBattery,
    isGame: sequence.isGame,
    cooldownSec: sequence.cooldownSec,
    steps: sequence.steps.map((step) => ({
      id: step.id,
      appPath: step.appPath,
    })),
  };
}
