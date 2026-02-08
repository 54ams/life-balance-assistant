// lib/analytics.ts
import type { DailyRecord } from "./types";

/**
 * Simple, report-friendly analytics:
 * - Descriptives (mean, sd, min, max, n)
 * - Pearson correlations (pairwise deletion)
 *
 * Designed for small pilot datasets and transparency in a viva.
 */

export type Descriptive = {
  n: number;
  mean?: number;
  sd?: number;
  min?: number;
  max?: number;
};

export type CorrelationRow = {
  a: string;
  b: string;
  n: number;
  r?: number; // Pearson r
};

export type AnalyticsSummary = {
  generatedAtISO: string;
  windowDays: number;
  nDaysTotal: number;
  nDaysWithLbi: number;
  nDaysWithWearable: number;
  nDaysWithCheckIn: number;
  descriptives: Record<string, Descriptive>;
  correlations: CorrelationRow[];
  highlights: string[];
};

function isNum(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function round(n: number, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

function describe(xs: number[]): Descriptive {
  const n = xs.length;
  if (n === 0) return { n: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? xs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  let min = xs[0];
  let max = xs[0];
  for (const v of xs) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { n, mean: round(mean, 2), sd: round(sd, 2), min: round(min, 2), max: round(max, 2) };
}

function pearson(a: number[], b: number[]): number | undefined {
  if (a.length !== b.length) return undefined;
  const n = a.length;
  if (n < 3) return undefined;

  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  if (!Number.isFinite(den) || den === 0) return undefined;
  return num / den;
}

function paired(days: DailyRecord[], getA: (d: DailyRecord) => number | undefined, getB: (d: DailyRecord) => number | undefined) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const d of days) {
    const a = getA(d);
    const b = getB(d);
    if (isNum(a) && isNum(b)) {
      xs.push(a);
      ys.push(b);
    }
  }
  return { xs, ys };
}

function moodToScore(m: DailyRecord["checkIn"] extends infer CI ? (CI extends { mood: infer M } ? M : never) : never): number | undefined {
  // In this codebase, mood is typically 1..4. Guard anyway.
  if (typeof m === "number" && Number.isFinite(m)) return m;
  return undefined;
}

function energyToScore(e: unknown): number | undefined {
  if (typeof e === "number" && Number.isFinite(e)) return e;
  return undefined;
}

function stressCount(si: any): number | undefined {
  if (!si || typeof si !== "object") return undefined;
  const vals = Object.values(si).filter((v) => v === true);
  return vals.length;
}

function absSortByStrength(rows: CorrelationRow[]) {
  return [...rows].sort((r1, r2) => Math.abs(r2.r ?? 0) - Math.abs(r1.r ?? 0));
}

export function buildAnalyticsSummary(days: DailyRecord[], windowDays = 30): AnalyticsSummary {
  // Sort by date, keep last windowDays (days already hold date strings)
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const slice = sorted.slice(Math.max(0, sorted.length - windowDays));

  const nDaysTotal = slice.length;
  const nDaysWithLbi = slice.filter((d) => isNum(d.lbi)).length;
  const nDaysWithWearable = slice.filter((d) => d.wearable && (isNum(d.wearable.recovery) || isNum(d.wearable.sleepHours) || isNum(d.wearable.strain))).length;
  const nDaysWithCheckIn = slice.filter((d) => !!d.checkIn).length;

  const lbi = slice.map((d) => d.lbi).filter(isNum);
  const recovery = slice.map((d) => d.wearable?.recovery).filter(isNum);
  const sleep = slice.map((d) => d.wearable?.sleepHours).filter(isNum);
  const strain = slice.map((d) => d.wearable?.strain).filter(isNum);

  const mood = slice.map((d) => moodToScore((d as any).checkIn?.mood)).filter(isNum);
  const energy = slice.map((d) => energyToScore((d as any).checkIn?.energy)).filter(isNum);
  const stress = slice.map((d) => stressCount((d as any).checkIn?.stressIndicators)).filter(isNum);

  const descriptives: Record<string, Descriptive> = {
    lbi: describe(lbi),
    recovery: describe(recovery),
    sleepHours: describe(sleep),
    strain: describe(strain),
    mood: describe(mood),
    energy: describe(energy),
    stressIndicatorsCount: describe(stress),
  };

  const corrRows: CorrelationRow[] = [];

  const addCorr = (a: string, b: string, getA: (d: DailyRecord) => number | undefined, getB: (d: DailyRecord) => number | undefined) => {
    const { xs, ys } = paired(slice, getA, getB);
    const r = pearson(xs, ys);
    corrRows.push({ a, b, n: xs.length, r: r != null ? round(r, 3) : undefined });
  };

  // LBI relationships
  addCorr("lbi", "recovery", (d) => (isNum(d.lbi) ? d.lbi : undefined), (d) => d.wearable?.recovery);
  addCorr("lbi", "sleepHours", (d) => (isNum(d.lbi) ? d.lbi : undefined), (d) => d.wearable?.sleepHours);
  addCorr("lbi", "strain", (d) => (isNum(d.lbi) ? d.lbi : undefined), (d) => d.wearable?.strain);
  addCorr("lbi", "mood", (d) => (isNum(d.lbi) ? d.lbi : undefined), (d) => moodToScore((d as any).checkIn?.mood));
  addCorr("lbi", "energy", (d) => (isNum(d.lbi) ? d.lbi : undefined), (d) => energyToScore((d as any).checkIn?.energy));
  addCorr("lbi", "stressIndicatorsCount", (d) => (isNum(d.lbi) ? d.lbi : undefined), (d) => stressCount((d as any).checkIn?.stressIndicators));

  // Wearable ↔ self-report
  addCorr("recovery", "mood", (d) => d.wearable?.recovery, (d) => moodToScore((d as any).checkIn?.mood));
  addCorr("sleepHours", "mood", (d) => d.wearable?.sleepHours, (d) => moodToScore((d as any).checkIn?.mood));
  addCorr("strain", "mood", (d) => d.wearable?.strain, (d) => moodToScore((d as any).checkIn?.mood));
  addCorr("recovery", "stressIndicatorsCount", (d) => d.wearable?.recovery, (d) => stressCount((d as any).checkIn?.stressIndicators));
  addCorr("sleepHours", "stressIndicatorsCount", (d) => d.wearable?.sleepHours, (d) => stressCount((d as any).checkIn?.stressIndicators));
  addCorr("strain", "stressIndicatorsCount", (d) => d.wearable?.strain, (d) => stressCount((d as any).checkIn?.stressIndicators));

  // Highlights: pick top correlations with enough n and |r| >= 0.35
  const usableCorr = corrRows.filter((r) => typeof r.r === "number" && r.n >= 7) as Array<CorrelationRow & { r: number }>;
  const top = absSortByStrength(usableCorr).filter((r) => Math.abs(r.r) >= 0.35).slice(0, 4);

  const pretty = (r: CorrelationRow & { r: number }) => {
    const dir = r.r > 0 ? "positive" : "negative";
    const strength = Math.abs(r.r) >= 0.6 ? "strong" : Math.abs(r.r) >= 0.45 ? "moderate" : "mild";
    return `${r.a} vs ${r.b}: ${strength} ${dir} relationship (r=${r.r}, n=${r.n}).`;
  };

  const highlights = top.length
    ? top.map(pretty)
    : [
        "Not enough data yet for robust correlations. Log more days (wearables + check-ins) to unlock stronger analytics.",
      ];

  return {
    generatedAtISO: new Date().toISOString(),
    windowDays,
    nDaysTotal,
    nDaysWithLbi,
    nDaysWithWearable,
    nDaysWithCheckIn,
    descriptives,
    correlations: corrRows,
    highlights,
  };
}

export function analyticsToCSV(summary: AnalyticsSummary): string {
  const lines: string[] = [];
  lines.push("section,key,n,mean,sd,min,max");
  for (const [k, d] of Object.entries(summary.descriptives)) {
    lines.push(
      ["descriptive", k, d.n, d.mean ?? "", d.sd ?? "", d.min ?? "", d.max ?? ""].join(",")
    );
  }
  lines.push("");
  lines.push("a,b,n,r");
  for (const row of summary.correlations) {
    lines.push([row.a, row.b, row.n, row.r ?? ""].join(","));
  }
  return lines.join("\n");
}

export function analyticsToMarkdown(summary: AnalyticsSummary): string {
  const d = summary.descriptives;
  const fmt = (x?: number) => (typeof x === "number" ? x.toString() : "—");
  const md: string[] = [];
  md.push(`# Analytics summary (last ${summary.windowDays} days)`);
  md.push(`Generated: ${summary.generatedAtISO}`);
  md.push("");
  md.push(`- Days total: ${summary.nDaysTotal}`);
  md.push(`- Days with LBI: ${summary.nDaysWithLbi}`);
  md.push(`- Days with wearable: ${summary.nDaysWithWearable}`);
  md.push(`- Days with check-ins: ${summary.nDaysWithCheckIn}`);
  md.push("");
  md.push("## Descriptives");
  md.push("| Metric | n | mean | sd | min | max |");
  md.push("|---|---:|---:|---:|---:|---:|");
  for (const key of Object.keys(d)) {
    const v = d[key];
    md.push(`| ${key} | ${v.n} | ${fmt(v.mean)} | ${fmt(v.sd)} | ${fmt(v.min)} | ${fmt(v.max)} |`);
  }
  md.push("");
  md.push("## Highlights");
  for (const h of summary.highlights) md.push(`- ${h}`);
  md.push("");
  md.push("## Correlations");
  md.push("| A | B | n | r |");
  md.push("|---|---|---:|---:|");
  for (const row of summary.correlations) {
    md.push(`| ${row.a} | ${row.b} | ${row.n} | ${typeof row.r === "number" ? row.r : "—"} |`);
  }
  md.push("");
  return md.join("\n");
}
