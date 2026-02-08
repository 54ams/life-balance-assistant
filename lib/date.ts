// lib/date.ts
import type { ISODate } from "./types";

/**
 * UI display date.
 * - Input: ISODate (YYYY-MM-DD)
 * - Output: "01 Jan 2026" (always Title Case month)
 */
export function formatDisplayDate(date: ISODate): string {
  // Use a UTC date to avoid off-by-one errors from local timezone shifts.
  const [yyyy, mm, dd] = date.split("-").map((x) => Number(x));
  const utc = new Date(Date.UTC(yyyy, mm - 1, dd));

  // en-GB gives day-month-year ordering; month:"short" gives Jan/Feb/...
  return utc.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
