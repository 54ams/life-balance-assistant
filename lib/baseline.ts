// lib/baseline.ts
import { getAllDays } from "./storage";

export async function computeBaseline(days = 7): Promise<number | null> {
  const all = await getAllDays();
  const recent = all.filter((r) => typeof r.lbi === "number").slice(-days);

  if (recent.length < 3) return null; // not enough data
  const avg = recent.reduce((sum, r) => sum + (r.lbi as number), 0) / recent.length;
  return Math.round(avg);
}

export type BaselineMeta = {
  baseline: number | null;
  daysUsed: number;
  targetDays: number;
  status: "calibrating" | "stable";
};

export async function computeBaselineMeta(targetDays = 7): Promise<BaselineMeta> {
  const all = await getAllDays();
  const recent = all.filter((r) => typeof r.lbi === "number").slice(-targetDays);

  const daysUsed = recent.length;
  const baseline =
    daysUsed < 3
      ? null
      : Math.round(recent.reduce((sum, r) => sum + (r.lbi as number), 0) / daysUsed);

  // "Stable" once the window is filled; otherwise calibrating.
  const status: BaselineMeta["status"] = daysUsed >= targetDays ? "stable" : "calibrating";

  return { baseline, daysUsed, targetDays, status };
}
