// lib/range.ts
import type { DailyRecord, ISODate } from "./types";

/**
 * Return the last `days` records with date <= endDate (inclusive), sorted ascending.
 */
export function sliceRecordsUpTo(records: DailyRecord[], endDate: ISODate, days: number): DailyRecord[] {
  const filtered = records.filter((r) => r.date <= endDate).sort((a, b) => a.date.localeCompare(b.date));
  if (!days || days <= 0) return filtered;
  return filtered.slice(-days);
}
