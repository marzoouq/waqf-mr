import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a percentage value to 2 decimal places with a % suffix. */
export function formatPercentage(value: number): string {
  return `${Number(value).toFixed(2)}%`;
}
