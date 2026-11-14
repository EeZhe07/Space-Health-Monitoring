import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui-style class merge helper. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function minutesBetween(fromIso: string, toIso: string) {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60_000);
}

export const contextLabel: Record<string, string> = {
  exercise: "during exercise",
  post_exercise: "after exercise",
  rest: "at rest",
};
