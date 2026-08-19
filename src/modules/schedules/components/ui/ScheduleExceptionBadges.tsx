import { IconBattery, IconGamepad } from "../../../../shared/ui/icons";

type ScheduleExceptionBadgesProps = {
  isGame: boolean;
  skipOnBattery: boolean;
};

export function ScheduleExceptionBadges({ isGame, skipOnBattery }: ScheduleExceptionBadgesProps) {
  if (!isGame && !skipOnBattery) return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {isGame ? <ExceptionBadge icon={IconGamepad} label="Game" tone="accent" /> : null}
      {skipOnBattery ? <ExceptionBadge icon={IconBattery} label="Skip on battery" tone="warning" /> : null}
    </div>
  );
}

function ExceptionBadge({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof IconGamepad;
  label: string;
  tone: "accent" | "warning";
}) {
  const toneClass =
    tone === "accent"
      ? "bg-accent-soft text-accent-fg"
      : "bg-warning-soft text-warning";

  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex size-5 items-center justify-center rounded-md ${toneClass}`}
    >
      <Icon className="size-3.5 shrink-0" />
    </span>
  );
}
