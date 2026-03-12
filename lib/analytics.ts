// lib/analytics.ts
import type { DailyRecord } from "./types";
import { DefaultModelConfig } from "./lbi";

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
  r?: number; // correlation coefficient
  method?: "pearson" | "spearman" | "lagged";
  lag?: number;
  ciLower?: number;
  ciUpper?: number;
  p?: number;
  fdr?: number;
  significant?: boolean;
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

function spearman(a: number[], b: number[]): number | undefined {
  if (a.length !== b.length) return undefined;
  const n = a.length;
  if (n < 3) return undefined;
  const rank = (xs: number[]) => {
    const pairs = xs.map((v, i) => [v, i] as const).sort((p1, p2) => p1[0] - p2[0]);
    const ranks: number[] = Array(xs.length);
    let i = 0;
    while (i < pairs.length) {
      let j = i;
      while (j + 1 < pairs.length && pairs[j + 1][0] === pairs[i][0]) j++;
      const r = (i + j + 2) / 2; // average rank (1-based)
      for (let k = i; k <= j; k++) ranks[pairs[k][1]] = r;
      i = j + 1;
    }
    return ranks;
  };
  const ra = rank(a);
  const rb = rank(b);
  return pearson(ra, rb);
}

function bootstrapCI(a: number[], b: number[], method: "pearson" | "spearman", samples = 500, alpha = 0.05) {
  const n = a.length;
  if (n < 3) return { lower: undefined, upper: undefined };
  const vals: number[] = [];
  for (let s = 0; s < samples; s++) {
    const ia = [];
    const ib = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * n);
      ia.push(a[idx]);
      ib.push(b[idx]);
    }
    const r = method === "pearson" ? pearson(ia, ib) : spearman(ia, ib);
    if (r != null && Number.isFinite(r)) vals.push(r);
  }
  if (!vals.length) return { lower: undefined, upper: undefined };
  vals.sort((x, y) => x - y);
  const lower = vals[Math.floor((alpha / 2) * vals.length)];
  const upper = vals[Math.floor((1 - alpha / 2) * vals.length)];
  return { lower, upper };
}

function bootstrapP(a: number[], b: number[], method: "pearson" | "spearman", samples = 500) {
  if (a.length < 3 || b.length < 3) return 1;
  const n = a.length;
  const observed = Math.abs((method === "pearson" ? pearson(a, b) : spearman(a, b)) ?? 0);
  let count = 0;
  for (let s = 0; s < samples; s++) {
    const shuffled = [...b].sort(() => Math.random() - 0.5);
    const r = Math.abs((method === "pearson" ? pearson(a, shuffled) : spearman(a, shuffled)) ?? 0);
    if (r >= observed) count++;
  }
  return (count + 1) / (samples + 1);
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

export function buildAnalyticsSummary(days: DailyRecord[], windowDays = 30): AnalyticsSummary {
  // Sort by date, keep last windowDays (days already hold date strings)
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const slice = sorted.slice(Math.max(0, sorted.length - windowDays));
  const MIN_CORR_N = 10;
  const MAX_LAG = 3;

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

  const addCorr = (
    a: string,
    b: string,
    getA: (d: DailyRecord) => number | undefined,
    getB: (d: DailyRecord) => number | undefined,
    method: "pearson" | "spearman" = "pearson",
    lag = 0
  ) => {
    const shifted = lag === 0 ? slice : slice.slice(lag);
    const shiftedB = lag === 0 ? slice : slice.slice(0, slice.length - lag);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < shifted.length && i < shiftedB.length; i++) {
      const va = getA(shifted[i]);
      const vb = getB(shiftedB[i]);
      if (isNum(va) && isNum(vb)) {
        xs.push(va);
        ys.push(vb);
      }
    }
    if (xs.length < MIN_CORR_N) return;
    const r = method === "pearson" ? pearson(xs, ys) : spearman(xs, ys);
    const { lower, upper } = bootstrapCI(xs, ys, method);
    const p = bootstrapP(xs, ys, method);
    corrRows.push({ a, b, n: xs.length, r: r != null ? round(r, 3) : undefined, ciLower: lower, ciUpper: upper, method, lag, p });
  };

  // LBI relationships
  addCorr("lbi", "recovery", (d) => (isNum(d.lbi) ? d.lbi : undefined), (d) => d.wearable?.recovery);
  addCorr("lbi", "sleepHours", (d) => (isNum(d.lbi) ? d.lbi : undefined), (d) => d.wearable?.sleepHours);
  addCorr("lbi", "strain", (d) => (isNum(d.lbi) ? d.lbi : undefined), (d) => d.wearable?.strain);
  addCorr("lbi", "mood", (d) => (isNum(d.lbi) ? d.lbi : undefined), (d) => moodToScore((d as any).checkIn?.mood), "spearman");
  addCorr("lbi", "energy", (d) => (isNum(d.lbi) ? d.lbi : undefined), (d) => energyToScore((d as any).checkIn?.energy), "spearman");
  addCorr("lbi", "stressIndicatorsCount", (d) => (isNum(d.lbi) ? d.lbi : undefined), (d) => stressCount((d as any).checkIn?.stressIndicators), "spearman");

  // Wearable ↔ self-report
  addCorr("recovery", "mood", (d) => d.wearable?.recovery, (d) => moodToScore((d as any).checkIn?.mood), "spearman");
  addCorr("sleepHours", "mood", (d) => d.wearable?.sleepHours, (d) => moodToScore((d as any).checkIn?.mood), "spearman");
  addCorr("strain", "mood", (d) => d.wearable?.strain, (d) => moodToScore((d as any).checkIn?.mood), "spearman");
  addCorr("recovery", "stressIndicatorsCount", (d) => d.wearable?.recovery, (d) => stressCount((d as any).checkIn?.stressIndicators), "spearman");
  addCorr("sleepHours", "stressIndicatorsCount", (d) => d.wearable?.sleepHours, (d) => stressCount((d as any).checkIn?.stressIndicators), "spearman");
  addCorr("strain", "stressIndicatorsCount", (d) => d.wearable?.strain, (d) => stressCount((d as any).checkIn?.stressIndicators), "spearman");

  // Lagged (0–3 days) for key pairs
  for (let lag = 1; lag <= MAX_LAG; lag++) {
    addCorr("sleepHours", "mood", (d) => d.wearable?.sleepHours, (d) => moodToScore((d as any).checkIn?.mood), "spearman", lag);
    addCorr("sleepHours", "stressIndicatorsCount", (d) => d.wearable?.sleepHours, (d) => stressCount((d as any).checkIn?.stressIndicators), "spearman", lag);
    addCorr("recovery", "mood", (d) => d.wearable?.recovery, (d) => moodToScore((d as any).checkIn?.mood), "spearman", lag);
    addCorr("recovery", "stressIndicatorsCount", (d) => d.wearable?.recovery, (d) => stressCount((d as any).checkIn?.stressIndicators), "spearman", lag);
  }

  // Highlights: pick top correlations with enough n and |r| >= 0.35, adjust with BH-FDR
  const usableCorr = corrRows.filter((r) => typeof r.r === "number") as Array<CorrelationRow & { r: number }>;
  // Benjamini-Hochberg
  const sortedByP = usableCorr.map((r) => ({ ...r, p: r.p ?? 1 })).sort((a, b) => (a.p ?? 1) - (b.p ?? 1));
  sortedByP.forEach((r, i) => {
    const rank = i + 1;
    const fdr = (r.p ?? 1) * (sortedByP.length / rank);
    r.fdr = Math.min(1, fdr);
    r.significant = (r.fdr ?? 1) < 0.1;
  });

  const top = [...usableCorr]
    .sort((r1, r2) => Math.abs(r2.r) - Math.abs(r1.r))
    .filter((r) => Math.abs(r.r) >= 0.35 && (r.significant || r.n >= MIN_CORR_N))
    .slice(0, 4);

  const pretty = (r: CorrelationRow & { r: number }) => {
    const dir = r.r > 0 ? "positive" : "negative";
    const strength = Math.abs(r.r) >= 0.6 ? "strong" : Math.abs(r.r) >= 0.45 ? "moderate" : "mild";
    const ci =
      r.ciLower != null && r.ciUpper != null ? `, 95% CI [${round(r.ciLower, 2)}, ${round(r.ciUpper, 2)}]` : "";
    const sig = r.significant ? "FDR q<0.1" : "exploratory";
    return `${r.a} vs ${r.b}: ${strength} ${dir} relationship (r=${r.r}, n=${r.n}${ci}, ${sig}).`;
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

// CSV export removed from primary UX; keep markdown as the user-facing summary.

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
