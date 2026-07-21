import { OnCueLogo } from "../../../shared/brand/OnCueLogo";
import { cn } from "../../../shared/lib/cn";
import { IconPlus } from "../../../shared/ui/icons";

type AppHeaderProps = {
  scheduleCount: number;
  panelOpen: boolean;
  onAdd: () => void;
};

export function AppHeader({ scheduleCount, panelOpen, onAdd }: AppHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-6 border-b border-border-subtle pb-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <OnCueLogo className="size-9" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-text-primary">OnCue</h1>
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <span className="size-1.5 rounded-full bg-success" aria-hidden />
                Планировщик работает
              </span>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {scheduleCount === 0
                ? "Пока нет расписаний"
                : `${scheduleCount} ${pluralSchedules(scheduleCount)} · перетащите строки, чтобы изменить порядок`}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onAdd}
        aria-pressed={panelOpen}
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-fast",
          panelOpen
            ? "bg-accent-soft text-accent-fg shadow-xs"
            : "bg-accent text-text-inverse shadow-sm hover:bg-accent-hover",
        )}
      >
        <IconPlus className="opacity-90" />
        Добавить автозапуск
      </button>
    </header>
  );
}

function pluralSchedules(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "расписание";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "расписания";
  return "расписаний";
}
