import type { ISODate } from "../types";

// Local-date-safe ISO YYYY-MM-DD
export function todayISO(): ISODate {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}` as ISODate;
}
