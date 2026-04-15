/** Format an ISO date (YYYY-MM-DD) to UK style dd/mm/yyyy */
export function formatDateUK(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Format to a friendly string like "Mon 7 Apr" */
export function formatDateFriendly(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Format to a full string like "Monday 7 April 2025" */
export function formatDateFull(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Format to "Monday 7 April" (no year) */
export function formatDateLong(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
