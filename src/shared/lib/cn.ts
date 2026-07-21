import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely (conditionals, overrides, no string-join hacks). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
