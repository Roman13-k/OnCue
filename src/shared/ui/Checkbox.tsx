import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export const checkboxClassName =
  "size-4 shrink-0 cursor-pointer rounded border-border accent-accent disabled:cursor-not-allowed disabled:opacity-60";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return <input type="checkbox" className={cn(checkboxClassName, className)} {...props} />;
}

type CheckboxFieldProps = {
  title: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export function CheckboxField({ title, hint, checked, disabled, onChange }: CheckboxFieldProps) {
  return (
    <label className={cn("flex items-start gap-3", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
      <Checkbox
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text-primary">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-text-muted">{hint}</span>
      </span>
    </label>
  );
}
