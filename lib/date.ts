// lib/date.ts
import type { ISODate } from "./types";
import { formatDateFriendly } from "./util/formatDate";
export { todayISO } from "./util/todayISO";

/**
 * UI display date.
 * - Input: ISODate (YYYY-MM-DD)
 * - Output: "22-Apr-26"
 */
export function formatDisplayDate(date: ISODate): string {
  return formatDateFriendly(date);
}
