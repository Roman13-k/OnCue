import { cn } from "../lib/cn";

type OnCueLogoProps = {
  className?: string;
  title?: string;
};

export function OnCueLogo({ className, title = "OnCue" }: OnCueLogoProps) {
  return (
    <svg
      className={cn("shrink-0 text-accent", className)}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path d="M11 8.5v15" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M14.5 10.2c5.2 1.4 8.3 5.1 8.3 5.8s-3.1 4.4-8.3 5.8"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.2" cy="16" r="1.7" fill="#fff" />
    </svg>
  );
}
