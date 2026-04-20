// lib/cycles.ts
//
// Behaviour-mood feedback cycle detection and visualisation.
// Based on behavioural activation theory (Lewinsohn, 1974; Jacobson, 2001):
// behaviour and mood form reinforcing loops, both positive and negative.
//
// The app surfaces ACTUAL cycles from user data — not generic advice.
// e.g. "On days you exercised, your next-day mood was 0.4 higher"
//
// Interconnections:
//   - Uses check-in data (valence, arousal, life context)
//   - Uses habit completion data
//   - Uses sleep hygiene scores
//   - Uses WHOOP wearable metrics
//   - Feeds into insights visualisation
//   - Pattern interrupt references negative cycles

import type { DailyRecord, ISODate } from "./types";
import { getHabits, getHabitLog, type Habit, type HabitLog } from "./habits";
import { getSleepHygieneHistory } from "./sleepHygiene";

export type CycleNode = {
  id: string;
  label: string;
  type: "behaviour" | "state" | "outcome";
};

export type CycleEdge = {
  from: string;
  to: string;
  strength: number; // -1..1
  evidence: string; // natural language
};

export type DetectedCycle = {
  id: string;
  direction: "positive" | "negative";
  title: string;
  description: string;
  nodes: CycleNode[];
  edges: CycleEdge[];
  confidence: "low" | "medium" | "high";
  dataPoints: number;
};

/**
 * Detect behaviour-mood cycles from user data.
 * Looks for correlations between behaviours on day N and mood on day N+1.
 */
export async function detectCycles(records: DailyRecord[]): Promise<DetectedCycle[]> {
  if (records.length < 7) return [];

  const cycles: DetectedCycle[] = [];
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  // 1. Exercise → Next-day mood
  const exerciseCycle = detectExerciseMoodCycle(sorted);
  if (exerciseCycle) cycles.push(exerciseCycle);

  // 2. Sleep quality → Next-day energy/mood
  const sleepCycle = detectSleepMoodCycle(sorted);
  if (sleepCycle) cycles.push(sleepCycle);

  // 3. Social connection → Mood
  const socialCycle = detectSocialMoodCycle(sorted);
  if (socialCycle) cycles.push(socialCycle);

  // 4. Stress → Withdrawal → More stress (negative)
  const withdrawalCycle = detectWithdrawalCycle(sorted);
  if (withdrawalCycle) cycles.push(withdrawalCycle);

  // 5. Habit completion → Mood
  const habitCycles = await detectHabitMoodCycles(sorted);
  cycles.push(...habitCycles);

  return cycles;
}

function detectExerciseMoodCycle(records: DailyRecord[]): DetectedCycle | null {
  const pairs: Array<{ exercised: boolean; nextMood: number }> = [];

  for (let i = 0; i < records.length - 1; i++) {
    const today = records[i];
    const tomorrow = records[i + 1];
    if (!today.checkIn || !tomorrow.checkIn?.valence) continue;

    const exercised = today.checkIn.exerciseDone === true ||
      today.checkIn.lifeContext?.some((c) => c.id === "exercise") === true;

    pairs.push({ exercised, nextMood: tomorrow.checkIn.valence });
  }

  if (pairs.length < 5) return null;

  const exMoods = pairs.filter((p) => p.exercised).map((p) => p.nextMood);
  const noExMoods = pairs.filter((p) => !p.exercised).map((p) => p.nextMood);

  if (exMoods.length < 2 || noExMoods.length < 2) return null;

  const avgEx = exMoods.reduce((a, b) => a + b, 0) / exMoods.length;
  const avgNoEx = noExMoods.reduce((a, b) => a + b, 0) / noExMoods.length;
  const diff = avgEx - avgNoEx;

  if (Math.abs(diff) < 0.15) return null;

  const direction = diff > 0 ? "positive" : "negative";

  return {
    id: "exercise_mood",
    direction,
    title: direction === "positive"
      ? "Exercise lifts your next-day mood"
      : "Skipping exercise may lower your mood",
    description: direction === "positive"
      ? `On days you moved, your next-day mood was ${(diff * 100).toFixed(0)}% higher on average.`
      : `Days without exercise were followed by mood scores ${(Math.abs(diff) * 100).toFixed(0)}% lower.`,
    nodes: [
      { id: "exercise", label: "Physical activity", type: "behaviour" },
      { id: "mood", label: "Next-day mood", type: "state" },
      { id: "motivation", label: "Motivation to move", type: "outcome" },
    ],
    edges: [
      { from: "exercise", to: "mood", strength: diff, evidence: `Based on ${pairs.length} days of data` },
      { from: "mood", to: "motivation", strength: diff * 0.7, evidence: "Higher mood generally increases activity motivation" },
      { from: "motivation", to: "exercise", strength: diff * 0.5, evidence: "Motivation feeds back into exercise likelihood" },
    ],
    confidence: pairs.length >= 14 ? "high" : pairs.length >= 7 ? "medium" : "low",
    dataPoints: pairs.length,
  };
}

function detectSleepMoodCycle(records: DailyRecord[]): DetectedCycle | null {
  const pairs: Array<{ sleepQuality: number; nextMood: number }> = [];

  for (let i = 0; i < records.length - 1; i++) {
    const today = records[i];
    const tomorrow = records[i + 1];
    if (!today.wearable?.sleepHours || !tomorrow.checkIn?.valence) continue;
    pairs.push({ sleepQuality: today.wearable.sleepHours, nextMood: tomorrow.checkIn.valence });
  }

  if (pairs.length < 5) return null;

  const goodSleep = pairs.filter((p) => p.sleepQuality >= 7);
  const poorSleep = pairs.filter((p) => p.sleepQuality < 6);

  if (goodSleep.length < 2 || poorSleep.length < 2) return null;

  const avgGood = goodSleep.reduce((s, p) => s + p.nextMood, 0) / goodSleep.length;
  const avgPoor = poorSleep.reduce((s, p) => s + p.nextMood, 0) / poorSleep.length;
  const diff = avgGood - avgPoor;

  if (Math.abs(diff) < 0.15) return null;

  return {
    id: "sleep_mood",
    direction: "positive",
    title: "Better sleep improves your mood",
    description: `After 7+ hours of sleep, your mood the next day is ${(diff * 100).toFixed(0)}% higher than after less than 6 hours.`,
    nodes: [
      { id: "sleep", label: "Sleep quality", type: "behaviour" },
      { id: "mood", label: "Next-day mood", type: "state" },
      { id: "energy", label: "Energy levels", type: "outcome" },
    ],
    edges: [
      { from: "sleep", to: "mood", strength: diff, evidence: `Based on ${pairs.length} nights` },
      { from: "sleep", to: "energy", strength: diff * 0.8, evidence: "Sleep directly replenishes energy stores" },
      { from: "energy", to: "sleep", strength: 0.3, evidence: "Good energy use during day promotes better sleep" },
    ],
    confidence: pairs.length >= 14 ? "high" : "medium",
    dataPoints: pairs.length,
  };
}

function detectSocialMoodCycle(records: DailyRecord[]): DetectedCycle | null {
  const pairs: Array<{ social: boolean; mood: number }> = [];

  for (const r of records) {
    if (!r.checkIn?.valence) continue;
    const social = r.checkIn.lifeContext?.some((c) => c.id === "social_connection") === true;
    pairs.push({ social, mood: r.checkIn.valence });
  }

  if (pairs.length < 7) return null;

  const socialMoods = pairs.filter((p) => p.social).map((p) => p.mood);
  const noSocialMoods = pairs.filter((p) => !p.social).map((p) => p.mood);

  if (socialMoods.length < 2 || noSocialMoods.length < 2) return null;

  const avgSocial = socialMoods.reduce((a, b) => a + b, 0) / socialMoods.length;
  const avgNoSocial = noSocialMoods.reduce((a, b) => a + b, 0) / noSocialMoods.length;
  const diff = avgSocial - avgNoSocial;

  if (Math.abs(diff) < 0.15) return null;

  return {
    id: "social_mood",
    direction: diff > 0 ? "positive" : "negative",
    title: "Social connection boosts your mood",
    description: `On days with social connection, your mood was ${(diff * 100).toFixed(0)}% higher.`,
    nodes: [
      { id: "social", label: "Social connection", type: "behaviour" },
      { id: "mood", label: "Mood", type: "state" },
      { id: "motivation", label: "Desire to connect", type: "outcome" },
    ],
    edges: [
      { from: "social", to: "mood", strength: diff, evidence: `Based on ${pairs.length} days` },
      { from: "mood", to: "motivation", strength: diff * 0.6, evidence: "Better mood makes socialising easier" },
      { from: "motivation", to: "social", strength: diff * 0.4, evidence: "Motivation leads to more connection" },
    ],
    confidence: pairs.length >= 14 ? "high" : "medium",
    dataPoints: pairs.length,
  };
}

function detectWithdrawalCycle(records: DailyRecord[]): DetectedCycle | null {
  // Look for: low mood days followed by fewer resources (withdrawal)
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let withdrawalAfterLow = 0;
  let lowMoodDays = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const today = sorted[i];
    const tomorrow = sorted[i + 1];
    if (!today.checkIn?.valence || !tomorrow.checkIn?.lifeContext) continue;

    if (today.checkIn.valence < -0.2) {
      lowMoodDays++;
      const resources = tomorrow.checkIn.lifeContext.filter((c) => c.kind === "resource").length;
      if (resources === 0) withdrawalAfterLow++;
    }
  }

  if (lowMoodDays < 3 || withdrawalAfterLow / lowMoodDays < 0.5) return null;

  return {
    id: "withdrawal_cycle",
    direction: "negative",
    title: "Low mood may be leading to withdrawal",
    description: `After difficult days, you tend to have fewer replenishing activities the next day. This can deepen the dip.`,
    nodes: [
      { id: "low_mood", label: "Low mood", type: "state" },
      { id: "withdrawal", label: "Fewer activities", type: "behaviour" },
      { id: "deeper_low", label: "Mood drops further", type: "outcome" },
    ],
    edges: [
      { from: "low_mood", to: "withdrawal", strength: -0.6, evidence: `${withdrawalAfterLow}/${lowMoodDays} low-mood days followed by withdrawal` },
      { from: "withdrawal", to: "deeper_low", strength: -0.5, evidence: "Fewer resources = less mood recovery" },
      { from: "deeper_low", to: "withdrawal", strength: -0.4, evidence: "Deeper lows make activity harder" },
    ],
    confidence: lowMoodDays >= 7 ? "high" : "medium",
    dataPoints: lowMoodDays,
  };
}

async function detectHabitMoodCycles(records: DailyRecord[]): Promise<DetectedCycle[]> {
  const habits = await getHabits();
  const cycles: DetectedCycle[] = [];

  for (const habit of habits.slice(0, 5)) { // limit to avoid over-processing
    const log = await getHabitLog(habit.id);
    const pairs: Array<{ done: boolean; nextMood: number }> = [];

    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < sorted.length - 1; i++) {
      const tomorrow = sorted[i + 1];
      if (!tomorrow.checkIn?.valence) continue;
      pairs.push({ done: log[sorted[i].date] === true, nextMood: tomorrow.checkIn.valence });
    }

    if (pairs.length < 7) continue;

    const doneMoods = pairs.filter((p) => p.done).map((p) => p.nextMood);
    const missedMoods = pairs.filter((p) => !p.done).map((p) => p.nextMood);

    if (doneMoods.length < 3 || missedMoods.length < 3) continue;

    const avgDone = doneMoods.reduce((a, b) => a + b, 0) / doneMoods.length;
    const avgMissed = missedMoods.reduce((a, b) => a + b, 0) / missedMoods.length;
    const diff = avgDone - avgMissed;

    if (Math.abs(diff) < 0.15) continue;

    cycles.push({
      id: `habit_${habit.id}_mood`,
      direction: diff > 0 ? "positive" : "negative",
      title: diff > 0
        ? `"${habit.name}" lifts your mood`
        : `Missing "${habit.name}" may affect your mood`,
      description: `When you complete "${habit.name}", your next-day mood averages ${(diff * 100).toFixed(0)}% higher.`,
      nodes: [
        { id: "habit", label: habit.name, type: "behaviour" },
        { id: "mood", label: "Next-day mood", type: "state" },
      ],
      edges: [
        { from: "habit", to: "mood", strength: diff, evidence: `Based on ${pairs.length} days` },
      ],
      confidence: pairs.length >= 14 ? "high" : "medium",
      dataPoints: pairs.length,
    });
  }

  return cycles;
}
