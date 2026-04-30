// bodyResolver.ts — single source of truth for "what is the body score we
// should show right now, and how fresh is it?". Centralises three things the
// bridge UI used to fudge:
//
//   1. Date alignment — WHOOP cycles aren't perfectly aligned to local
//      midnight, so today's recovery sometimes only lands hours after wake.
//      We look back up to N days to find usable data, and label it.
//   2. Partial-data labelling — strain-only days now produce a labelled
//      "partial body score" instead of "—".
//   3. Freshness — the UI never shows a day-old number without saying so.
//
// Pure (no IO): caller passes in the records, we compute the answer.

import { physioScoreDetailed, type PhysioScore } from "./bridge";
import type { DailyRecord, ISODate } from "./types";

export type BodyResolution = {
  /** The numeric score (0..100) — null if no data anywhere in the window. */
  value: number | null;
  /** The date the body number actually came from (could be < today). */
  sourceDate: ISODate | null;
  /** "today" | "yesterday" | "older" — for the freshness label. */
  ageBucket: "today" | "yesterday" | "older" | "none";
  /** Detail returned by physioScoreDetailed so the UI can label partial scores. */
  detail: PhysioScore | null;
  /** ISO datetime when the wearable record was last fetched, if known. */
  syncedAt: string | null;
  /** Human label for the UI — "Synced just now", "From yesterday", etc. */
  freshnessLabel: string;
  /** True when the resolver had to look past `today` to find data. */
  isStale: boolean;
};

function isoDaysAgo(today: ISODate, n: number): ISODate {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` as ISODate;
}

function describeFreshness(syncedAt: string | null, ageBucket: BodyResolution["ageBucket"]): string {
  if (ageBucket === "none") return "No body data yet";
  if (ageBucket === "older") return "Using older WHOOP data";
  if (ageBucket === "yesterday") return "Using latest WHOOP data — from yesterday";
  // today
  if (!syncedAt) return "Synced today";
  const ageMs = Date.now() - new Date(syncedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return "Synced today";
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 1) return "Synced just now";
  if (mins < 60) return `Synced ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `Synced ${hrs}h ago`;
}

/**
 * Resolve "the body score for today", looking back up to `maxLookback` days
 * if today has no usable wearable data. Pure — pass in pre-loaded records.
 */
export function resolveBody(
  today: ISODate,
  recordsByDate: Map<ISODate, DailyRecord>,
  maxLookback: number = 2,
): BodyResolution {
  for (let i = 0; i <= maxLookback; i++) {
    const iso = isoDaysAgo(today, i);
    const rec = recordsByDate.get(iso);
    const detail = rec ? physioScoreDetailed(rec) : null;
    if (rec && detail) {
      const ageBucket =
        i === 0 ? "today" : i === 1 ? "yesterday" : "older";
      const syncedAt = rec.wearableSyncedAt ?? null;
      return {
        value: detail.value,
        sourceDate: iso,
        ageBucket,
        detail,
        syncedAt,
        freshnessLabel: describeFreshness(syncedAt, ageBucket),
        isStale: i > 0,
      };
    }
  }

  return {
    value: null,
    sourceDate: null,
    ageBucket: "none",
    detail: null,
    syncedAt: null,
    freshnessLabel: "No body data yet",
    isStale: false,
  };
}

/**
 * Convenience: build the lookup map from an array of records (e.g. from
 * `listDailyRecords`). Keeps callers from hand-rolling the same loop.
 */
export function recordsToMap(records: DailyRecord[]): Map<ISODate, DailyRecord> {
  const map = new Map<ISODate, DailyRecord>();
  for (const r of records) map.set(r.date, r);
  return map;
}
