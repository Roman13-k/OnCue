import type { ReactNode } from "react";
import { cn } from "../lib/cn";

type ActionButtonProps = {
  children: ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
};

export function ActionButton({ children, label, danger, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-text-muted transition-colors duration-fast",
        danger
          ? "hover:bg-danger-soft hover:text-danger"
          : "hover:bg-surface-muted hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}
