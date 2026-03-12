import { getAllDays } from "@/lib/storage";
import type { DailyRecord } from "@/lib/types";
import { buildDataset } from "./dataset";

export type ModelEvalSummary = {
  splitDate: string;
  trainDays: number;
  testDays: number;
  cls: { acc: number; precision: number; recall: number; auc?: number; brier: number };
  calibration: { pred: number; obs: number; n: number }[];
};

type Metrics = { tp: number; fp: number; tn: number; fn: number };

function metrics(rows: Array<{ y: 0 | 1; p: number }>): Metrics & { acc: number; precision: number; recall: number; brier: number } {
  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0;
  let brier = 0;
  for (const r of rows) {
    const yhat = r.p >= 0.5 ? 1 : 0;
    if (yhat === 1 && r.y === 1) tp++;
    else if (yhat === 1 && r.y === 0) fp++;
    else if (yhat === 0 && r.y === 0) tn++;
    else fn++;
    brier += Math.pow(r.p - r.y, 2);
  }
  const n = rows.length || 1;
  const acc = (tp + tn) / n;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  return { tp, fp, tn, fn, acc, precision, recall, brier: brier / n };
}

function aucROC(rows: Array<{ y: 0 | 1; p: number }>): number | undefined {
  if (rows.length < 5) return undefined;
  const sorted = [...rows].sort((a, b) => b.p - a.p);
  let tp = 0,
    fp = 0;
  const P = rows.filter((r) => r.y === 1).length;
  const N = rows.filter((r) => r.y === 0).length;
  if (P === 0 || N === 0) return undefined;
  let auc = 0;
  let prevFpr = 0,
    prevTpr = 0;
  for (const r of sorted) {
    if (r.y === 1) tp++;
    else fp++;
    const tpr = tp / P;
    const fpr = fp / N;
    auc += (fpr - prevFpr) * (tpr + prevTpr) * 0.5;
    prevFpr = fpr;
    prevTpr = tpr;
  }
  return auc;
}

function calibrate(rows: Array<{ y: 0 | 1; p: number }>, bins = 5) {
  const out: { pred: number; obs: number; n: number }[] = [];
  for (let i = 0; i < bins; i++) {
    const lo = i / bins;
    const hi = (i + 1) / bins;
    const bin = rows.filter((r) => r.p >= lo && r.p < hi);
    if (!bin.length) continue;
    const pred = bin.reduce((s, r) => s + r.p, 0) / bin.length;
    const obs = bin.reduce((s, r) => s + r.y, 0) / bin.length;
    out.push({ pred, obs, n: bin.length });
  }
  return out;
}

export async function runModelEvaluation(): Promise<ModelEvalSummary> {
  const all = await getAllDays();
  const usable = all.filter((d) => d.wearable && typeof d.lbi === "number" && d.checkIn);
  if (usable.length < 30) throw new Error("Need at least 30 days with wearable + check-in + LBI.");

  const sorted = [...usable].sort((a, b) => a.date.localeCompare(b.date));
  const splitIdx = Math.floor(sorted.length * 0.7);
  const train = sorted.slice(0, splitIdx);
  const test = sorted.slice(splitIdx);
  const splitDate = test[0]?.date ?? sorted[sorted.length - 1].date;

  const trainDs = buildDataset(train);
  const testDs = buildDataset(test);

  const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const sd = (xs: number[]) => Math.sqrt(xs.reduce((s, v) => s + Math.pow(v - mean(xs), 2), 0) / xs.length);

  const mu: number[] = [];
  const sigma: number[] = [];
  const dims = trainDs[0]?.x.length ?? 0;
  for (let j = 0; j < dims; j++) {
    const vals = trainDs.map((r) => r.x[j]);
    mu[j] = mean(vals);
    sigma[j] = sd(vals) || 1;
  }

  const standardize = (x: number[], j: number) => (x[j] - mu[j]) / sigma[j];
  const predict = (row: typeof trainDs[0]) => {
    const z = row.x.map((_, j) => standardize(row.x, j));
    const score = z.reduce((s, v) => s + v, 0) / z.length;
    return 1 / (1 + Math.exp(-score));
  };

  const preds = testDs.map((r) => ({ y: r.yLbiDrop, p: predict(r) }));
  const m = metrics(preds);
  const auc = aucROC(preds);
  const calib = calibrate(preds);

  return {
    splitDate,
    trainDays: train.length,
    testDays: test.length,
    cls: { acc: m.acc, precision: m.precision, recall: m.recall, auc, brier: m.brier },
    calibration: calib,
  };
}

