import type { DailyCheckIn } from "./storage";

export type WearableMetrics = {
  recovery: number;      // 0–100 (WHOOP style)
  sleepHours: number;    // hours
  hrv?: number;          // ms (optional)
  restingHR?: number;    // bpm (optional)
};

export type ActionContext = {
  date: string;                 // YYYY-MM-DD
  wearable: WearableMetrics;
  checkIn: DailyCheckIn | null; // null if not done yet
  lbi: number;                  // today’s score
  baseline: number | null;      // null until enough days
};

export type ActionCategory = "RECOVERY" | "BALANCED" | "PERFORMANCE" | "CHECKIN_REQUIRED";

export type ActionPlan = {
  category: ActionCategory;
  focus: string;        // one-liner
  actions: string[];    // 3–5 bullets
  notifyTitle?: string;
  notifyBody?: string;
  why: string[];        // evidence bullets
  llmPrompt?: string;   // optional: for explanation/personalisation
};
