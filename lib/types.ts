// lib/types.ts

export type ISODate = `${number}-${number}-${number}`; // YYYY-MM-DD

export type StressIndicators = {
  muscleTension: boolean;
  racingThoughts: boolean;
  irritability: boolean;
  avoidance: boolean;
  restlessness: boolean;
};


export type ContextTag =
  | "illness"
  | "travel"
  | "late_meal"
  | "alcohol"
  | "acute_stress"
  | "menstrual_cycle";

export type DailyCheckIn = {
  // Anchored 4-point scale (less subjective drift than 1–5 sliders)
  mood: 1 | 2 | 3 | 4; // 😖 😐 🙂 😄
  energy?: 1 | 2 | 3 | 4; // depleted, low, ok, high

  // Bias-reduced stress: derived from observable indicators
  stressIndicators: StressIndicators;

  // Optional behavioural anchors (low effort, high signal)
  caffeineAfter2pm?: boolean;
  alcohol?: boolean;
  deepWorkMins?: 0 | 15 | 30 | 60 | 90 | 120;

  contextTags?: ContextTag[];

  notes?: string;
};

export type WearableMetrics = {
  // WHOOP-like signals
  recovery: number; // 0–100
  sleepHours: number; // hours
  strain?: number; // 0–21

  // Optional extras if you add later
  hrv?: number;
  restingHR?: number;
};

export type WearableSource = "normalized_csv" | "whoop_export" | "apple_health_export";

export type WearableDay = {
  date: ISODate;
  wearable: WearableMetrics;
  source: WearableSource;
};

export type DailyRecord = {
  date: ISODate;

  checkIn: DailyCheckIn | null;
  wearable?: WearableMetrics;
  wearableSource?: WearableSource;

  // Derived
  lbi?: number;
  lbiMeta?: {
    classification: "balanced" | "overloaded" | "under-recovered";
    confidence: "high" | "medium" | "low";
    reason: string;
  };
};

// --- Planning output (what we persist + display in History/Trends/Export) ---
export type PlanCategory = "RECOVERY" | "NORMAL" | "PUSH";

export type SavedPlan = {
  date: ISODate; // YYYY-MM-DD
  lbi: number;
  baseline: number | null;
  category: PlanCategory;
  focus: string;
  actions: string[];
  triggers: string[];
  confidence?: number; // 0-1
  explanation?: string;
};

export type ExportPayload = {
  exportedAt: string; // ISO
  days: number;
  data: SavedPlan[];
};
