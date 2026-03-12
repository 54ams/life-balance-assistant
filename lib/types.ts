// lib/types.ts

export type ISODate = `${number}${number}${number}${number}-${number}${number}-${number}${number}`; // YYYY-MM-DD

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
  // Core scales (1–5)
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  sleepQuality: 1 | 2 | 3 | 4 | 5;

  // Stress indicators (optional but encouraged)
  stressIndicators?: StressIndicators;

  // Behaviours / contexts
  caffeineAfter2pm?: boolean;
  alcohol?: boolean;
  exerciseDone?: boolean;
  deepWorkMins?: number;
  hydrationLitres?: number;

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

export type WearableSource =
  | "whoop_export"
  | "apple_health_export"
  | "simulated_stub";

export type FutureEvent = {
  id: string;
  dateISO: ISODate;
  title: string;
  tags?: string[];
  impactLevel: "low" | "medium" | "high";
  notes?: string;
};

export type EmotionValue =
  | "Growth"
  | "Connection"
  | "Health"
  | "Peace"
  | "Discipline"
  | "Purpose"
  | string; // user-defined, capped at 6 active

export type RegulationState = "handled" | "manageable" | "overwhelmed";

export type EmotionalDiaryEntry = {
  date: ISODate;
  valence: number; // -1..1 pleasant → unpleasant
  arousal: number; // -1..1 calm → activated
  intensity: number; // 0..1 radial distance (derived)
  contextTags: string[]; // 1–3 non-clinical tags
  regulation: RegulationState;
  valueChosen: EmotionValue;
  reflection?: string;
  source: "user";
};

export type WearableDay = {
  date: ISODate;
  wearable: WearableMetrics;
  source: WearableSource;
};

export type DailyRecord = {
  date: ISODate;

  checkIn: DailyCheckIn | null;
  emotion?: EmotionalDiaryEntry | null;
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
export type PlanCategory = "RECOVERY" | "NORMAL";

export type SavedPlan = {
  date: ISODate; // YYYY-MM-DD
  lbi: number;
  baseline: number | null;
  category: PlanCategory;
  focus: string;
  actions: string[];
  actionReasons?: string[];
  completedActions?: boolean[];
  triggers: string[];
  confidence?: "high" | "medium" | "low";
  explanation?: string;
};

export type ExportPayload = {
  exportedAt: string; // ISO
  days: number;
  data: SavedPlan[];
};
