import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../apps/api";

export type HabitSuggestion = {
  id: string;
  app: string;
  appPath: string;
  iconDataUrl?: string | null;
  weekday: number;
  from: string;
  to: string;
  confidence: number;
  autostartEnabled: boolean;
};

export type HabitSuggestionsResult = {
  ok: boolean;
  source: string;
  threshold: number;
  suggestions: HabitSuggestion[];
  error?: string | null;
};

export async function getHabitSuggestions(
  threshold = 0.6,
): Promise<HabitSuggestionsResult> {
  if (!isTauriRuntime()) {
    throw new Error("ML suggestions are only available in the OnCue app");
  }
  return invoke<HabitSuggestionsResult>("get_habit_suggestions", { threshold });
}

export async function setSuggestionAutostart(
  item: HabitSuggestion,
  enabled: boolean,
): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("Suggestion autostart is only available in the OnCue app");
  }
  await invoke("set_suggestion_autostart", { item, enabled });
}
