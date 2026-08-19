import { useCallback, useEffect, useState } from "react";
import { getAppAutostartEnabled, setAppAutostart } from "../../shell/autostart";

type SettingsState = {
  launchOnStartup: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
};

const INITIAL: SettingsState = {
  launchOnStartup: false,
  loading: true,
  saving: false,
  error: null,
};

export function useSettings(enabled = true) {
  const [state, setState] = useState<SettingsState>(INITIAL);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const launchOnStartup = await getAppAutostartEnabled();
      setState((prev) => ({
        ...prev,
        launchOnStartup,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setLaunchOnStartup = useCallback(async (enabledValue: boolean) => {
    setState((prev) => ({ ...prev, launchOnStartup: enabledValue, saving: true, error: null }));
    try {
      await setAppAutostart(enabledValue);
      setState((prev) => ({ ...prev, saving: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        launchOnStartup: !enabledValue,
        saving: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  return { ...state, setLaunchOnStartup };
}
