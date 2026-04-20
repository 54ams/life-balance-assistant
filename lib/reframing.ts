// lib/reframing.ts
//
// CBT-based thought reframing tool (Beck, 1979).
// Three-column technique: Automatic thought → Evidence → Reframe.
//
// Interconnections:
//   - Triggered when check-in valence is < -0.3
//   - Pattern interrupt system suggests reframing during decline
//   - Weekly reflection counts reframes as a "win"
//   - Insights can show reframe frequency vs mood improvement

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ISODate } from "./types";
import { todayISO } from "./util/todayISO";

const REFRAMES_KEY = "life_balance_reframes_v1";

export type ThoughtReframe = {
  id: string;
  date: ISODate;
  timestamp: string; // ISO datetime
  automaticThought: string; // The negative/unhelpful thought
  cognitiveDistortion?: CognitiveDistortion; // Optional label
  evidenceFor: string; // Evidence supporting the thought
  evidenceAgainst: string; // Evidence against the thought
  reframe: string; // Balanced alternative thought
  valenceAtTime?: number; // Mood when reframe was done (-1..1)
  valenceAfter?: number; // Mood after reframe (if user re-checks)
};

export type CognitiveDistortion =
  | "all_or_nothing" // Black and white thinking
  | "catastrophising" // Assuming the worst
  | "mind_reading" // Assuming what others think
  | "fortune_telling" // Predicting negative outcomes
  | "emotional_reasoning" // Feelings = facts
  | "should_statements" // Rigid rules
  | "labelling" // Global negative labels
  | "discounting_positive" // Dismissing good things
  | "magnification" // Exaggerating negatives
  | "personalisation"; // Taking undue blame

export const DISTORTION_LABELS: Record<CognitiveDistortion, { label: string; description: string }> = {
  all_or_nothing: { label: "All-or-nothing", description: "Seeing things in black and white with no middle ground" },
  catastrophising: { label: "Catastrophising", description: "Jumping to the worst possible outcome" },
  mind_reading: { label: "Mind reading", description: "Assuming you know what others are thinking" },
  fortune_telling: { label: "Fortune telling", description: "Predicting things will go badly" },
  emotional_reasoning: { label: "Emotional reasoning", description: "Believing something is true because it feels true" },
  should_statements: { label: "Should statements", description: "Rigid rules about how things must be" },
  labelling: { label: "Labelling", description: "Putting a fixed global label on yourself or others" },
  discounting_positive: { label: "Discounting the positive", description: "Dismissing good things that happen" },
  magnification: { label: "Magnification", description: "Blowing negatives out of proportion" },
  personalisation: { label: "Personalisation", description: "Taking blame for things outside your control" },
};

async function loadReframes(): Promise<ThoughtReframe[]> {
  try {
    const raw = await AsyncStorage.getItem(REFRAMES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveReframes(reframes: ThoughtReframe[]): Promise<void> {
  await AsyncStorage.setItem(REFRAMES_KEY, JSON.stringify(reframes));
}

export async function createReframe(
  data: Omit<ThoughtReframe, "id" | "date" | "timestamp">,
): Promise<ThoughtReframe> {
  const reframes = await loadReframes();
  const entry: ThoughtReframe = {
    ...data,
    id: `reframe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: todayISO(),
    timestamp: new Date().toISOString(),
  };
  reframes.push(entry);
  await saveReframes(reframes);
  return entry;
}

export async function getReframes(days: number = 30): Promise<ThoughtReframe[]> {
  const reframes = await loadReframes();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  return reframes.filter((r) => r.date >= cutoffISO).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function getReframeCount(days: number = 7): Promise<number> {
  const recent = await getReframes(days);
  return recent.length;
}

export async function getTodayReframes(): Promise<ThoughtReframe[]> {
  const today = todayISO();
  const all = await loadReframes();
  return all.filter((r) => r.date === today);
}

/**
 * Should we suggest a reframe? Based on current valence from check-in.
 */
export function shouldSuggestReframe(valence: number): boolean {
  return valence < -0.3;
}

/**
 * Guided prompts to help users through the reframe process.
 */
export const REFRAME_PROMPTS = {
  thought: [
    "What thought keeps coming back?",
    "What's the thing your mind keeps saying?",
    "If you could put the feeling into words, what would it say?",
  ],
  evidenceFor: [
    "What makes this thought feel true?",
    "What evidence supports this thought?",
    "Why does this feel real right now?",
  ],
  evidenceAgainst: [
    "What would a kind friend say about this?",
    "Is there another way to see this?",
    "What evidence goes against this thought?",
    "Have there been times when this wasn't true?",
  ],
  reframe: [
    "What's a more balanced way to see this?",
    "If this thought were less extreme, what would it sound like?",
    "What would you tell someone you love in this situation?",
  ],
};

/**
 * Get a random prompt for a given step.
 */
export function getPrompt(step: keyof typeof REFRAME_PROMPTS): string {
  const prompts = REFRAME_PROMPTS[step];
  return prompts[Math.floor(Math.random() * prompts.length)];
}
