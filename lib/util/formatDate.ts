const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Short display format used across the app: dd-MMM-yy (e.g. 22-Apr-26). */
export function formatDateFriendly(iso: string): string {
  const [y, m, d] = iso.split("-");
  const monthIdx = Math.max(0, Math.min(11, Number(m) - 1));
  return `${pad2(Number(d))}-${MONTHS_SHORT[monthIdx]}-${y.slice(-2)}`;
}

/** Legacy name kept for compatibility — same as formatDateFriendly. */
export function formatDateUK(iso: string): string {
  return formatDateFriendly(iso);
}

/** Long form, only used on hero headers where we want the weekday: "Wednesday 22 April 2026". */
export function formatDateFull(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** "Wednesday 22 April" — no year, used on check-in hero. */
export function formatDateLong(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
