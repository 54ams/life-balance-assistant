import type { DailyCheckIn } from "./storage";

export type LbiInputs = {
  recovery: number; // 0-100 (WHOOP later). For now we can hardcode.
  sleepHours: number; // hours (WHOOP later)
  checkIn: DailyCheckIn | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function scoreFrom1to5(value: 1 | 2 | 3 | 4 | 5) {
  return ((value - 1) / 4) * 100;
}

export function stressInverseFrom1to5(stress: 1 | 2 | 3 | 4 | 5) {
  return ((5 - stress) / 4) * 100;
}

export function sleepScore(hours: number) {
  return clamp((hours / 8) * 100, 0, 100);
}

export function calculateLBI({ recovery, sleepHours, checkIn }: LbiInputs) {
  // if no check-in yet, we can’t compute mood/stress/energy properly
  if (!checkIn) {
    return {
      lbi: Math.round(0.35 * recovery + 0.2 * sleepScore(sleepHours)),
      reason: "Add today’s check-in to personalise your score.",
    };
  }

  const moodScore = scoreFrom1to5(checkIn.mood);
  const energyScore = scoreFrom1to5(checkIn.energy);
  const stressInv = stressInverseFrom1to5(checkIn.stress);
  const sScore = sleepScore(sleepHours);

  const lbi =
    0.35 * recovery +
    0.2 * sScore +
    0.2 * moodScore +
    0.15 * stressInv +
    0.1 * energyScore;

  const rounded = Math.round(lbi);

  // simple explanation (we’ll make this smarter later)
  const reason =
    checkIn.stress >= 4
      ? "Stress is high, which is pulling your balance down."
      : checkIn.mood <= 2
      ? "Mood is low today, so keep expectations light."
      : "Mood and recovery look steady.";

  return { lbi: rounded, reason };
}
