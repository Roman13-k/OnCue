import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../apps/api";
import type { Sequence } from "../types";

function isSequence(value: unknown): value is Sequence {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.enabled === "boolean" &&
    typeof item.triggerName === "string" &&
    typeof item.triggerPath === "string" &&
    Array.isArray(item.steps) &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
}

export async function loadSequences(): Promise<Sequence[]> {
  if (!isTauriRuntime()) return [];
  const sequences = await invoke<Sequence[]>("load_sequences");
  return sequences.filter(isSequence).map(normalizeSequence);
}

function normalizeSequence(item: Sequence & Record<string, unknown>): Sequence {
  const legacy = item as {
    triggerSkipOnBattery?: boolean;
    triggerIsGame?: boolean;
  };

  return {
    ...item,
    triggerIconDataUrl: item.triggerIconDataUrl ?? null,
    skipOnBattery: item.skipOnBattery ?? legacy.triggerSkipOnBattery ?? false,
    isGame: item.isGame ?? legacy.triggerIsGame ?? false,
    cooldownSec: item.cooldownSec ?? 60,
    steps: item.steps.map((step) => ({
      ...step,
      iconDataUrl: step.iconDataUrl ?? null,
    })),
  };
}

export async function saveSequences(sequences: Sequence[]): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("save_sequences", { sequences });
}

export async function runSequenceNow(sequenceId: string) {
  if (!isTauriRuntime()) return [];
  return invoke<{ path: string; ok: boolean; error: string | null }[]>("run_sequence_now", {
    sequenceId,
  });
}
