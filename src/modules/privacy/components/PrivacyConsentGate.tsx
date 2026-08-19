import { useCallback, useEffect, useState } from "react";
import { OnCueLogo } from "../../../shared/brand/OnCueLogo";
import { acceptPrivacyConsent, getPrivacyConsent, quitApp } from "../api";

type PrivacyConsentGateProps = {
  children: React.ReactNode;
};

export function PrivacyConsentGate({ children }: PrivacyConsentGateProps) {
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ok = await getPrivacyConsent();
        if (!cancelled) {
          setAccepted(ok);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setAccepted(false);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onAccept = useCallback(async () => {
    setBusy(true);
    try {
      await acceptPrivacyConsent();
      setAccepted(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }, []);

  const onDecline = useCallback(() => {
    void quitApp();
  }, []);

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface text-sm text-text-muted">
        Loading…
      </div>
    );
  }

  if (!accepted) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface px-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface-elevated p-6 shadow-md">
          <div className="flex items-center gap-3">
            <OnCueLogo className="size-10" />
            <div>
              <h1 className="text-lg font-semibold text-text-primary">Local usage data</h1>
              <p className="text-xs text-text-muted">Required once before OnCue can help you</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm leading-relaxed text-text-secondary">
            <p>
              OnCue can remember which apps you open and when, so it can suggest schedules that
              match your habits.
            </p>
            <p>
              This data stays <span className="font-medium text-text-primary">only on this PC</span>
              — in a local database. Nothing is uploaded to the internet or shared with anyone.
            </p>
            <p>Suggestions are calculated inside OnCue — no extra software install is required.</p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onDecline}
              disabled={busy}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Quit
            </button>
            <button
              type="button"
              onClick={() => {
                void onAccept();
              }}
              disabled={busy}
              className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {busy ? "Saving…" : "I agree — continue"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
