import { IconPlus } from "../../../../shared/ui/icons";

type SequenceEmptyProps = {
  onCreate: () => void;
};

export function SequenceEmpty({ onCreate }: SequenceEmptyProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-elevated/60 px-6 text-center">
      <button
        type="button"
        onClick={onCreate}
        aria-label="Add sequence"
        className="mb-3 flex size-11 cursor-pointer items-center justify-center rounded-lg bg-accent text-text-inverse shadow-sm transition-colors duration-fast hover:bg-accent-hover"
      >
        <IconPlus />
      </button>
      <p className="text-sm font-medium text-text-primary">No sequences yet</p>
      <p className="mt-1 max-w-xs text-sm text-text-muted">
        Group apps that launch together when you open the trigger — for example Steam with Discord and music.
      </p>
    </div>
  );
}
