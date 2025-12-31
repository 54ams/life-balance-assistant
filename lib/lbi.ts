import type { DailyCheckIn } from "./storage";

export type LbiInputs = {
  recovery: number; // 0-100
  sleepHours: number; // hours
  checkIn: DailyCheckIn | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toNum(x: unknown, fallback: number) {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(n: number, min: number, max: number) {
  return Math.round(clamp(n, min, max));
}

export function scoreFrom1to5(value: 1 | 2 | 3 | 4 | 5) {
  return ((value - 1) / 4) * 100;
}

export function stressInverseFrom1to5(stress: 1 | 2 | 3 | 4 | 5) {
  return ((5 - stress) / 4) * 100;
}

function sleepScoreFromHours(hours: number) {
  // Map ~5h => 0, ~9h => 100 (clamped)
  const h = clamp(hours, 4, 10);
  const scaled = ((h - 5) / (9 - 5)) * 100;
  return clamp(scaled, 0, 100);
}

export function calculateLBI(input: LbiInputs): { lbi: number; reason: string } {
  // ✅ safe inputs (prevents NaN)
  const rec = clamp(toNum(input.recovery, 60), 0, 100);
  const sleepHours = clamp(toNum(input.sleepHours, 7.5), 0, 24);

  // mood/stress may be missing in demo mode → default to neutral (3)
  const moodRaw = input.checkIn ? toNum((input.checkIn as any).mood, 3) : 3;
  const stressRaw = input.checkIn ? toNum((input.checkIn as any).stress, 3) : 3;

  const mood15 = clampInt(moodRaw, 1, 5) as 1 | 2 | 3 | 4 | 5;
  const stress15 = clampInt(stressRaw, 1, 5) as 1 | 2 | 3 | 4 | 5;

  const recoveryScore = rec; // already 0–100
  const sleepScore = sleepScoreFromHours(sleepHours);
  const moodScore = scoreFrom1to5(mood15);
  const stressScore = stressInverseFrom1to5(stress15);

  // weights (simple + stable for MVP)
  const score =
    recoveryScore * 0.4 + // 40%
    sleepScore * 0.3 + // 30%
    moodScore * 0.15 + // 15%
    stressScore * 0.15; // 15%

  // ✅ final guard
  const safeScore = Number.isFinite(score) ? score : 60;
  const lbi = clampInt(safeScore, 0, 100);

  // Reason string (simple explainability)
  let reason = "Your balance looks steady today.";
  if (stress15 >= 4) reason = "Stress is high, which is pulling your balance down.";
  else if (mood15 <= 2) reason = "Mood is low, which is pulling your balance down.";
  else if (sleepHours <= 6.5) reason = "Sleep is low, which is pulling your balance down.";
  else if (rec <= 40) reason = "Recovery is low, which is pulling your balance down.";

  return { lbi, reason };
}
