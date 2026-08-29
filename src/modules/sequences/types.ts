export type SequenceStep = {
  id: string;
  appName: string;
  appPath: string;
  iconDataUrl: string | null;
};

export type Sequence = {
  id: string;
  name: string;
  enabled: boolean;
  triggerName: string;
  triggerPath: string;
  triggerIconDataUrl: string | null;
  skipOnBattery: boolean;
  isGame: boolean;
  steps: SequenceStep[];
  cooldownSec: number;
  createdAt: string;
  updatedAt: string;
};

export type SequenceStepFormValues = {
  id: string;
  appPath: string;
};

export type SequenceFormValues = {
  name: string;
  triggerPath: string;
  skipOnBattery: boolean;
  isGame: boolean;
  steps: SequenceStepFormValues[];
  cooldownSec: number;
};

export type SequencePanelState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; sequenceId: string };

export type SequenceDisplayStatus = "active" | "paused" | "error";

export function getSequenceDisplayStatus(sequence: Sequence): SequenceDisplayStatus {
  if (!sequence.enabled) return "paused";
  return "active";
}
