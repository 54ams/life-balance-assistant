// lib/import/normalizedCsv.ts
import type { ISODate, WearableDay, WearableMetrics } from "../types";

export type ImportError = {
  /** 1-based row number in the CSV (header row is 1). */
  row: number;
  field: string;
  message: string;
};

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

/**
 * Parses dd-mmm-yy (case-insensitive), returns ISODate (YYYY-MM-DD) or null.
 * Examples:
 * - 01-jan-26 -> 2026-01-01
 * - 01-Jan-26 -> 2026-01-01
 */
export function parseDdMmmYyToISO(input: string): ISODate | null {
  const s = input.trim().toLowerCase();
  const m = s.match(/^([0-3]\d)-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-(\d{2})$/);
  if (!m) return null;

  const dd = m[1];
  const mmm = m[2];
  const yy = m[3];

  const month = MONTHS[mmm];
  if (!month) return null;

  const day = Number(dd);
  if (day < 1 || day > 31) return null;

  // Two-digit year pivot:
  // 00..69 => 2000..2069, 70..99 => 1970..1999
  const yyn = Number(yy);
  const yyyy = yyn >= 70 ? 1900 + yyn : 2000 + yyn;

  // Validate day/month combo using a UTC date round-trip
  const dt = new Date(Date.UTC(yyyy, Number(month) - 1, day));
  if (
    dt.getUTCFullYear() !== yyyy ||
    dt.getUTCMonth() !== Number(month) - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }

  return `${yyyy}-${month}-${dd}` as ISODate;
}

function toNumber(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function requireNumber(
  row: number,
  field: string,
  value: string,
  errors: ImportError[],
  opts?: { min?: number; max?: number }
): number | null {
  const n = toNumber(value);
  if (n == null) {
    errors.push({ row, field, message: "Missing or non-numeric value." });
    return null;
  }
  if (opts?.min != null && n < opts.min) {
    errors.push({ row, field, message: `Value must be ≥ ${opts.min}.` });
    return null;
  }
  if (opts?.max != null && n > opts.max) {
    errors.push({ row, field, message: `Value must be ≤ ${opts.max}.` });
    return null;
  }
  return n;
}

/**
 * Normalised wearable CSV schema:
 * date,sleep_hours,recovery,strain,hrv,rhr
 * - date: dd-mmm-yy
 * - sleep_hours: decimal hours
 * - recovery: 0..100
 * - strain: optional (number)
 * - hrv: optional
 * - rhr: optional
 */
export function parseNormalizedWearableCsv(csvText: string): {
  days: WearableDay[];
  errors: ImportError[];
} {
  const errors: ImportError[] = [];
  const text = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      days: [],
      errors: [{ row: 1, field: "csv", message: "CSV is empty." }],
    };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["date", "sleep_hours", "recovery"]; // strain/hrv/rhr optional
  for (const key of required) {
    if (!header.includes(key)) {
      errors.push({ row: 1, field: "header", message: `Missing required column: ${key}` });
    }
  }
  if (errors.length) return { days: [], errors };

  const idx = (name: string) => header.indexOf(name);
  const iDate = idx("date");
  const iSleep = idx("sleep_hours");
  const iRec = idx("recovery");
  const iStrain = idx("strain");
  const iHrv = idx("hrv");
  const iRhr = idx("rhr");

  // Use a map to de-duplicate by ISO date (keep last occurrence)
  const map = new Map<ISODate, WearableMetrics>();

  for (let li = 1; li < lines.length; li++) {
    const rowNumber = li + 1; // header is row 1
    const cols = lines[li].split(",");

    const rawDate = cols[iDate] ?? "";
    const iso = parseDdMmmYyToISO(rawDate);
    if (!iso) {
      errors.push({
        row: rowNumber,
        field: "date",
        message: "Invalid date. Expected dd-mmm-yy (e.g. 01-Jan-26).",
      });
      continue;
    }

    const sleepHours = requireNumber(rowNumber, "sleep_hours", cols[iSleep] ?? "", errors, {
      min: 0,
      max: 24,
    });
    const recovery = requireNumber(rowNumber, "recovery", cols[iRec] ?? "", errors, {
      min: 0,
      max: 100,
    });
    if (sleepHours == null || recovery == null) continue;

    const strain = iStrain >= 0 ? toNumber(cols[iStrain] ?? "") ?? undefined : undefined;
    const hrv = iHrv >= 0 ? toNumber(cols[iHrv] ?? "") ?? undefined : undefined;
    const restingHR = iRhr >= 0 ? toNumber(cols[iRhr] ?? "") ?? undefined : undefined;

    map.set(iso, {
      recovery,
      sleepHours,
      strain,
      hrv,
      restingHR,
    });
  }

  const days: WearableDay[] = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, wearable]) => ({
      date,
      wearable,
      source: "normalized_csv",
    }));

  return { days, errors };
}
