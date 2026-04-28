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

/**
 * Life-context tag — the thing the user is actually carrying today.
 * Taxonomy grounded in Lazarus & Folkman's (1984) transactional model:
 * "demand" tags are stressors (things asking something of the person),
 * "resource" tags are supports (things replenishing the person). This
 * keeps the check-in short while letting downstream code compute
 * appraisal-style balance rather than just an aggregate negative score.
 *
 * `kind` is carried alongside the id so new tags can be added without
 * a schema migration. Keep `id` snake_case and stable — it persists.
 */
export type LifeContextTag = {
  id: string;
  kind: "demand" | "resource";
  /** Optional free-text specifier the user typed (e.g. "viva" for exam). */
  detail?: string;
};

/**
 * Post-save accuracy signal. Users can tap "yes / not really" after
 * saving a check-in — feeds the reliability story for the dissertation
 * and gently calibrates future suggestions.
 */
export type ReliabilitySignal = {
  feelsAccurate: boolean;
  at: string; // ISO datetime of the tap
};

export type DailyCheckIn = {
  // --- Canvas-based capture (Russell 1980 circumplex) ------------
  // `valence` and `arousal` are the primary capture on the redesigned
  // check-in screen. Legacy 1–5 fields below are derived from these
  // for back-compat with LBI + history views.
  valence?: number; // -1..1 unpleasant → pleasant
  arousal?: number; // -1..1 calm → activated

  // --- Life context ---------------------------------------------
  // Replaces free-text context with a short structured list. At most
  // ~4 tags surfaced in UI, but the type allows more for future use.
  lifeContext?: LifeContextTag[];

  // --- Legacy 1–5 scales ----------------------------------------
  // Preserved so historical records keep rendering and LBI keeps
  // working. New check-ins populate these by DERIVING from valence,
  // arousal, and the life-context balance (see lib/derive.ts).
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

  // --- Reliability micro-signal ---------------------------------
  reliability?: ReliabilitySignal;
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
  | "whoop_demo"
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
