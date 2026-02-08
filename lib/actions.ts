import type { DailyCheckIn, WearableMetrics } from "./types";

export type ActionPlan = {
  category: "RECOVERY" | "NORMAL";
  focus: string;
  actions: string[];
  notifyBody?: string;
  llmPrompt?: string;
};

export function buildActionPlan(input: {
  date: string;
  wearable: WearableMetrics;
  checkIn: DailyCheckIn | null;
  lbi: number;
  baseline: number | null;
}): ActionPlan {
  const { wearable, checkIn, lbi, baseline } = input;

const stressHigh = checkIn
  ? Object.values(checkIn.stressIndicators).filter(Boolean).length >= 3
  : false;
  const moodLow = checkIn ? checkIn.mood <= 2 : false;
  const recoveryLow = wearable.recovery <= 40;
  const sleepLow = wearable.sleepHours <= 6.5;

  const baselineDrop = baseline !== null ? lbi < baseline * 0.85 : false;

  const needsRecovery = stressHigh || moodLow || recoveryLow || sleepLow || baselineDrop;

  if (needsRecovery) {
    return {
      category: "RECOVERY",
      focus: "Low-demand day: protect energy and reduce load.",
      actions: [
        "20–30 min easy walk (Zone 2 / conversational pace)",
        "Hydrate + one proper meal with protein",
        "10 min wind-down (stretch / shower / breathing) earlier tonight",
      ],
      notifyBody:
        "Your score is below your baseline. Consider a low-demand day: 20–30 min walk + early wind-down.",
      llmPrompt:
        "Write 2 short sentences explaining why a low-demand day is recommended, based on recovery/sleep and check-in signals. Keep it supportive and practical.",
    };
  }

  return {
    category: "NORMAL",
    focus: "Normal day: train as planned + do 1 priority task.",
    actions: [
      "Train as planned (keep good form, stop 1–2 reps before failure)",
      "Pick 1 priority task and finish it before other admin",
      "Get outside for 10 min daylight",
    ],
    llmPrompt:
      "Write 2 short sentences reinforcing a normal training day and one priority task, based on steady balance signals.",
  };
}
