import { useCallback, useEffect, useRef, useState } from "react";
import { getHabitSuggestions, setSuggestionAutostart, type HabitSuggestion } from "../api";

type SuggestionsState = {
  suggestions: HabitSuggestion[];
  loading: boolean;
  error: string | null;
  source: string | null;
  refreshedAt: number | null;
};

const INITIAL: SuggestionsState = {
  suggestions: [],
  loading: false,
  error: null,
  source: null,
  refreshedAt: null,
};

export function useHabitSuggestions(threshold = 0.6, enabled = true) {
  const [state, setState] = useState<SuggestionsState>(INITIAL);
  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await getHabitSuggestions(thresholdRef.current);
      if (!result.ok) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: result.error ?? "Couldn’t load suggestions",
          suggestions: [],
        }));
        return;
      }
      setState({
        suggestions: result.suggestions,
        loading: false,
        error: null,
        source: result.source,
        refreshedAt: Date.now(),
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [refresh, enabled]);

  const toggleAutostart = useCallback(async (item: HabitSuggestion, enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      suggestions: prev.suggestions.map((row) =>
        row.id === item.id ? { ...row, autostartEnabled: enabled } : row,
      ),
    }));
    try {
      await setSuggestionAutostart(item, enabled);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        suggestions: prev.suggestions.map((row) =>
          row.id === item.id ? { ...row, autostartEnabled: !enabled } : row,
        ),
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  return { ...state, refresh, toggleAutostart };
}
