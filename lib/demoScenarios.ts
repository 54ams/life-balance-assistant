// lib/demoScenarios.ts
//
// Narrative 14-day demo datasets designed to be steerable live during the
// viva. Each scenario produces a deterministic (seeded) arc so the examiner
// sees the exact chart you rehearsed — no surprises from Math.random().
//
// All scenarios:
//   - 14 days, ending today.
//   - Physiological (recovery, sleep, strain) + psychological (mood,
//     energy, stress, sleepQuality, indicators) are internally consistent
//     so correlations and the Mind–Body Bridge read as designed.
//   - Use the same storage pipeline as seedDemo() for portability.

import { calculateLBI } from "./lbi";
import { clearAll, upsertCheckIn, upsertEmotion, upsertLBI, upsertWearable } from "./storage";
import type { DailyCheckIn, EmotionalDiaryEntry, ISODate, RegulationState } from "./types";
import { clamp } from "./util/clamp";
import { todayISO } from "./util/todayISO";

export type ScenarioKey =
  | "healthy"
  | "stress_spike"
  | "recovery_dip"
  | "sleep_debt"
  | "burnout_recovery"
  | "training_block"
  | "exam_week";

export type ScenarioMeta = {
  key: ScenarioKey;
  title: string;
  blurb: string;
  talkingPoint: string;
};

export const SCENARIOS: ScenarioMeta[] = [
  {
    key: "healthy",
    title: "Healthy week",
    blurb: "Consistent recovery, steady mood, balanced LBI.",
    talkingPoint: "Baseline case — shows the app's empty-state-ish story when life is steady.",
  },
  {
    key: "stress_spike",
    title: "Stress spike",
    blurb: "Two acute-stress days mid-week with knock-on recovery.",
    talkingPoint: "Demonstrates the Mind–Body Bridge lag: mental signals on day N → physiological drop day N+1.",
  },
  {
    key: "recovery_dip",
    title: "Recovery dip",
    blurb: "A gradual drop in recovery across 5 days, then rebound.",
    talkingPoint: "Shows baseline deviation detection and recovery-biased plan suggestions.",
  },
  {
    key: "sleep_debt",
    title: "Sleep debt",
    blurb: "Consecutive short-sleep nights eroding mood and energy.",
    talkingPoint: "Highlights H2 (stress indicators vs LBI) and sleep's ≥35% weight in the composite.",
  },
  {
    key: "burnout_recovery",
    title: "Burnout → recovery",
    blurb: "Heavy first week, lighter second week, steady rebuild.",
    talkingPoint: "Shows adherence + plan following into a tangible LBI rebound (H3).",
  },
  {
    key: "training_block",
    title: "Training block",
    blurb: "High strain Mon/Wed/Fri, rest Tue/Thu, solid sleep.",
    talkingPoint: "Illustrates strain + recovery decoupling from mental affect when sleep is protected.",
  },
  {
    key: "exam_week",
    title: "Exam week",
    blurb: "Rising stress, late nights, weekend rebound.",
    talkingPoint: "Most relatable to student viva examiners; stress-indicator coverage peaks mid-week.",
  },
];

/**
 * Simple deterministic PRNG so each scenario renders the same curve every run.
 * mulberry32 variant.
 */
function prng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDateNDaysAgo(n: number): ISODate {
  const d = new Date(todayISO());
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}` as ISODate;
}

type DayCurve = {
  recovery: number;
  sleepHours: number;
  strain: number;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  stress: 1 | 2 | 3 | 4 | 5;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  stressIndicatorCount: number;
  regulation: RegulationState;
  valence: number;
  arousal: number;
};

function clampScale(n: number): 1 | 2 | 3 | 4 | 5 {
  return (Math.max(1, Math.min(5, Math.round(n))) as 1 | 2 | 3 | 4 | 5);
}

function curveFor(scenario: ScenarioKey, dayIndex: number, rand: () => number): DayCurve {
  // dayIndex: 0 = 13 days ago, 13 = today
  const jitter = (amt: number) => (rand() - 0.5) * 2 * amt;

  switch (scenario) {
    case "healthy": {
      const recovery = clamp(72 + jitter(8), 5, 95);
      const sleepHours = clamp(7.6 + jitter(0.5), 4, 10);
      const strain = clamp(11 + jitter(2.5), 0, 21);
      return {
        recovery,
        sleepHours,
        strain,
        mood: clampScale(4 + jitter(0.6)),
        energy: clampScale(4 + jitter(0.6)),
        stress: clampScale(2 + jitter(0.6)),
        sleepQuality: clampScale(4 + jitter(0.5)),
        stressIndicatorCount: Math.max(0, Math.min(2, Math.round(jitter(1)))),
        regulation: "handled",
        valence: clamp(0.4 + jitter(0.2), -1, 1),
        arousal: clamp(0.1 + jitter(0.3), -1, 1),
      };
    }

    case "stress_spike": {
      // Spike on days 6 & 7 (mental), physiological drop days 7 & 8 (lag +1).
      const spike = dayIndex === 6 || dayIndex === 7;
      const lag = dayIndex === 7 || dayIndex === 8;
      const baseRec = spike ? 55 : lag ? 36 : 70;
      const baseStress = spike ? 4.5 : lag ? 3.5 : 2.3;
      return {
        recovery: clamp(baseRec + jitter(6), 5, 95),
        sleepHours: clamp((spike ? 5.6 : 7.3) + jitter(0.4), 4, 10),
        strain: clamp((spike ? 15 : 11) + jitter(2), 0, 21),
        mood: clampScale((spike ? 2 : 4) + jitter(0.5)),
        energy: clampScale((spike ? 2 : 4) + jitter(0.5)),
        stress: clampScale(baseStress + jitter(0.4)),
        sleepQuality: clampScale((spike ? 2 : 4) + jitter(0.5)),
        stressIndicatorCount: spike ? 4 : lag ? 3 : 1,
        regulation: spike ? "overwhelmed" : lag ? "manageable" : "handled",
        valence: clamp((spike ? -0.5 : 0.3) + jitter(0.15), -1, 1),
        arousal: clamp((spike ? 0.6 : 0.1) + jitter(0.2), -1, 1),
      };
    }

    case "recovery_dip": {
      // U-shape recovery: high → low mid (day 5-9) → high again
      const bell = Math.cos(((dayIndex - 7) / 7) * Math.PI);
      const recovery = clamp(55 + bell * 25 + jitter(4), 5, 95);
      return {
        recovery,
        sleepHours: clamp(7.0 + bell * 0.8 + jitter(0.3), 4, 10),
        strain: clamp(12 + (1 - bell) * 3 + jitter(2), 0, 21),
        mood: clampScale(3 + bell * 1.2 + jitter(0.4)),
        energy: clampScale(3 + bell * 1.2 + jitter(0.4)),
        stress: clampScale(3 - bell * 1.2 + jitter(0.4)),
        sleepQuality: clampScale(3 + bell * 1 + jitter(0.4)),
        stressIndicatorCount: bell < -0.2 ? 3 : 1,
        regulation: bell < -0.3 ? "manageable" : "handled",
        valence: clamp(0.2 + bell * 0.4 + jitter(0.15), -1, 1),
        arousal: clamp(0.1 + jitter(0.2), -1, 1),
      };
    }

    case "sleep_debt": {
      // Progressively shorter sleep days 2–9, weekend rebound 11–13
      const short = dayIndex >= 2 && dayIndex <= 9;
      const rebound = dayIndex >= 11;
      const sleepHours = clamp(
        (rebound ? 8.2 : short ? 5.4 - (dayIndex - 2) * 0.1 : 7.3) + jitter(0.3),
        4,
        10
      );
      return {
        recovery: clamp((rebound ? 75 : short ? 40 : 65) + jitter(6), 5, 95),
        sleepHours,
        strain: clamp(11.5 + jitter(2), 0, 21),
        mood: clampScale((rebound ? 4 : short ? 2.5 : 3.5) + jitter(0.4)),
        energy: clampScale((rebound ? 4 : short ? 2 : 3.5) + jitter(0.4)),
        stress: clampScale((short ? 3.6 : 2.2) + jitter(0.4)),
        sleepQuality: clampScale((rebound ? 4.5 : short ? 2 : 3.5) + jitter(0.4)),
        stressIndicatorCount: short ? 3 : 0,
        regulation: short ? "manageable" : "handled",
        valence: clamp((rebound ? 0.3 : short ? -0.2 : 0.2) + jitter(0.15), -1, 1),
        arousal: clamp((short ? 0.3 : 0) + jitter(0.2), -1, 1),
      };
    }

    case "burnout_recovery": {
      // First 7 days rough, last 7 days steady climb
      const firstHalf = dayIndex < 7;
      const progress = firstHalf ? 1 - dayIndex / 7 : (dayIndex - 7) / 7;
      const base = firstHalf ? 38 + progress * -8 : 50 + progress * 30;
      return {
        recovery: clamp(base + jitter(5), 5, 95),
        sleepHours: clamp((firstHalf ? 5.8 : 7.6) + jitter(0.4), 4, 10),
        strain: clamp((firstHalf ? 16 : 12) + jitter(2), 0, 21),
        mood: clampScale((firstHalf ? 2.4 : 3.8) + jitter(0.4)),
        energy: clampScale((firstHalf ? 2.2 : 3.8) + jitter(0.4)),
        stress: clampScale((firstHalf ? 4 : 2.4) + jitter(0.4)),
        sleepQuality: clampScale((firstHalf ? 2 : 4) + jitter(0.4)),
        stressIndicatorCount: firstHalf ? 4 : 1,
        regulation: firstHalf ? "overwhelmed" : "handled",
        valence: clamp((firstHalf ? -0.3 : 0.3) + jitter(0.15), -1, 1),
        arousal: clamp((firstHalf ? 0.5 : 0) + jitter(0.2), -1, 1),
      };
    }

    case "training_block": {
      // High strain Mon/Wed/Fri (i.e. dayIndex % 2 === 0 in simplified calendar)
      // Rest Tue/Thu, big sleep on rest days
      const today = new Date();
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - dayIndex));
      const weekday = d.getDay(); // 0=Sun
      const isTraining = weekday === 1 || weekday === 3 || weekday === 5;
      const isRest = weekday === 2 || weekday === 4;
      return {
        recovery: clamp((isTraining ? 50 : 75) + jitter(6), 5, 95),
        sleepHours: clamp((isRest ? 8.3 : 7.4) + jitter(0.3), 4, 10),
        strain: clamp((isTraining ? 17 : isRest ? 7 : 12) + jitter(1.5), 0, 21),
        mood: clampScale(4 + jitter(0.4)),
        energy: clampScale((isTraining ? 3 : 4) + jitter(0.4)),
        stress: clampScale(2 + jitter(0.4)),
        sleepQuality: clampScale(4 + jitter(0.4)),
        stressIndicatorCount: 1,
        regulation: "handled",
        valence: clamp(0.35 + jitter(0.15), -1, 1),
        arousal: clamp((isTraining ? 0.4 : 0.1) + jitter(0.2), -1, 1),
      };
    }

    case "exam_week": {
      // Build-up Mon–Thu, peak Fri, weekend rebound
      const buildupDay = Math.min(4, dayIndex); // clamp
      const peak = dayIndex >= 9 && dayIndex <= 11;
      const rebound = dayIndex >= 12;
      const stressLoad = peak ? 4.5 : rebound ? 2 : 2.5 + buildupDay * 0.4;
      return {
        recovery: clamp((peak ? 42 : rebound ? 72 : 60) + jitter(5), 5, 95),
        sleepHours: clamp((peak ? 5.8 : rebound ? 8.4 : 6.8) + jitter(0.3), 4, 10),
        strain: clamp(10 + jitter(2), 0, 21),
        mood: clampScale((peak ? 2.3 : rebound ? 4.2 : 3.5) + jitter(0.4)),
        energy: clampScale((peak ? 2.3 : rebound ? 4 : 3.3) + jitter(0.4)),
        stress: clampScale(stressLoad + jitter(0.3)),
        sleepQuality: clampScale((peak ? 2 : rebound ? 4.3 : 3.2) + jitter(0.4)),
        stressIndicatorCount: peak ? 4 : rebound ? 0 : 2,
        regulation: peak ? "overwhelmed" : rebound ? "handled" : "manageable",
        valence: clamp((peak ? -0.4 : rebound ? 0.4 : 0) + jitter(0.15), -1, 1),
        arousal: clamp((peak ? 0.6 : rebound ? 0 : 0.2) + jitter(0.2), -1, 1),
      };
    }
  }
}

function indicatorsFromCount(count: number) {
  const keys: Array<keyof NonNullable<DailyCheckIn["stressIndicators"]>> = [
    "muscleTension",
    "racingThoughts",
    "irritability",
    "avoidance",
    "restlessness",
  ];
  const out: NonNullable<DailyCheckIn["stressIndicators"]> = {
    muscleTension: false,
    racingThoughts: false,
    irritability: false,
    avoidance: false,
    restlessness: false,
  };
  for (let i = 0; i < Math.max(0, Math.min(5, count)); i++) out[keys[i]] = true;
  return out;
}

/**
 * Wipe storage and seed a 14-day scenario. Uses a scenario-specific seed so
 * repeated runs produce identical output (reproducible for viva demo).
 */
export async function seedScenario(scenario: ScenarioKey, values: string[] = ["Peace", "Health", "Growth"]) {
  await clearAll();
  const seedByScenario: Record<ScenarioKey, number> = {
    healthy: 101,
    stress_spike: 202,
    recovery_dip: 303,
    sleep_debt: 404,
    burnout_recovery: 505,
    training_block: 606,
    exam_week: 707,
  };
  const rand = prng(seedByScenario[scenario]);

  for (let dayIndex = 0; dayIndex <= 13; dayIndex++) {
    const date = isoDateNDaysAgo(13 - dayIndex);
    const curve = curveFor(scenario, dayIndex, rand);

    await upsertWearable(date, {
      recovery: Math.round(curve.recovery),
      sleepHours: Math.round(curve.sleepHours * 10) / 10,
      strain: Math.round(curve.strain * 10) / 10,
    });

    const checkIn: DailyCheckIn = {
      mood: curve.mood,
      energy: curve.energy,
      stressLevel: curve.stress,
      sleepQuality: curve.sleepQuality,
      stressIndicators: indicatorsFromCount(curve.stressIndicatorCount),
      caffeineAfter2pm: rand() < 0.3,
      alcohol: rand() < 0.1,
      exerciseDone: rand() < (scenario === "training_block" ? 0.8 : 0.5),
      deepWorkMins: Math.round(rand() * 120),
      hydrationLitres: Math.round((1.3 + rand() * 1.2) * 10) / 10,
    };
    await upsertCheckIn(date, checkIn);

    const value = values[dayIndex % values.length] ?? "Health";
    const emotion: EmotionalDiaryEntry = {
      date,
      valence: curve.valence,
      arousal: curve.arousal,
      intensity: Math.min(1, Math.sqrt(curve.valence * curve.valence + curve.arousal * curve.arousal)),
      contextTags: [],
      regulation: curve.regulation,
      valueChosen: value,
      source: "user",
    };
    await upsertEmotion(emotion);

    const lbiRes = calculateLBI({
      recovery: curve.recovery,
      sleepHours: curve.sleepHours,
      strain: curve.strain,
      checkIn,
    });
    await upsertLBI(date, {
      lbi: lbiRes.lbi,
      classification: lbiRes.classification,
      confidence: lbiRes.confidence,
      reason: lbiRes.reason,
    });
  }
}
