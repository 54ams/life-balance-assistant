// lib/llm/fallback.ts
//
// Deterministic, template-based emotion reflection used when the backend LLM
// is unreachable (no Wi-Fi, no backend deployed, 5xx, timeout, or toggle off).
//
// Design goals:
//   - Always returns a warm, non-clinical 2-3 sentence reflection.
//   - Mirrors the tone of backend/api/explain.ts system prompt so the UX
//     reads consistently whether online or offline.
//   - No randomness that could surprise an examiner: same payload → same text.
//   - No advice, no diagnosis, no "should/must/try" language.
//
// Returned text is intentionally short (< ~80 words) to match the remote LLM
// budget (max_tokens 140 in backend/api/explain.ts).

import type { RegulationState } from "../types";

export type ReflectionTone = "Gentle" | "Direct" | "Playful";

export type ReflectionInput = {
  valence?: number;          // -1..1 pleasant → unpleasant
  arousal?: number;          // -1..1 calm → activated
  regulation?: RegulationState;
  contextTags?: string[];
  valueChosen?: string;
  recoveryBand?: "low" | "mid" | "high";
};

function emotionPhrase(valence: number, arousal: number): string {
  const pleasant = valence >= 0;
  const activated = arousal >= 0;
  if (pleasant && !activated) return "calm and settled";
  if (pleasant && activated) return "energised and upbeat";
  if (!pleasant && !activated) return "quiet and a little low";
  return "tense and activated";
}

function regulationPhrase(reg: RegulationState | undefined): string {
  switch (reg) {
    case "handled":
      return "it looks like you're handling things steadily";
    case "overwhelmed":
      return "it seems things feel heavy right now";
    case "manageable":
    default:
      return "it seems things feel workable today";
  }
}

function recoveryBackdrop(band: ReflectionInput["recoveryBand"]): string | null {
  if (!band) return null;
  if (band === "low") return "Recovery is on the lower side today, which can colour how things feel.";
  if (band === "high") return "Your body seems well-rested, which can soften the edges of a busy day.";
  return null;
}

function contextWeave(tags: string[] | undefined): string | null {
  if (!tags || tags.length === 0) return null;
  const cleaned = tags.slice(0, 2).map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (!cleaned.length) return null;
  if (cleaned.length === 1) return `This might reflect ${cleaned[0]} in the background.`;
  return `This might reflect ${cleaned[0]} and ${cleaned[1]} in the background.`;
}

function valueLine(value: string | undefined, tone: ReflectionTone): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (tone === "Playful") return `And ${v.toLowerCase()} still gets to have a seat at the table today.`;
  if (tone === "Direct") return `${v} is part of what you care about — worth keeping in view.`;
  return `${v} is something that matters to you, and it's gently showing up here.`;
}

function openingByTone(emotion: string, regulationStr: string, tone: ReflectionTone): string {
  if (tone === "Direct") {
    return `You're ${emotion}, and ${regulationStr}.`;
  }
  if (tone === "Playful") {
    return `Looks like a ${emotion} kind of moment — ${regulationStr}.`;
  }
  return `It seems like you're feeling ${emotion}, and ${regulationStr}.`;
}

/**
 * Build a 2-3 sentence non-clinical reflection from the same payload
 * reflectEmotion() sends to the backend.
 *
 * Always returns a string. Safe to call with a partial payload.
 */
export function templateReflection(
  input: ReflectionInput,
  tone: ReflectionTone = "Gentle"
): string {
  const valence = typeof input.valence === "number" ? input.valence : 0;
  const arousal = typeof input.arousal === "number" ? input.arousal : 0;
  const emotion = emotionPhrase(valence, arousal);
  const regulationStr = regulationPhrase(input.regulation);

  const opening = openingByTone(emotion, regulationStr, tone);

  const parts: string[] = [opening];

  const backdrop = recoveryBackdrop(input.recoveryBand);
  if (backdrop) parts.push(backdrop);

  const context = contextWeave(input.contextTags);
  if (context) parts.push(context);

  const valueSentence = valueLine(input.valueChosen, tone);
  if (valueSentence && parts.length < 3) parts.push(valueSentence);

  // Keep to at most 3 sentences, at most ~80 words.
  const joined = parts.slice(0, 3).join(" ");
  if (joined.split(/\s+/).length > 80) {
    // Trim to the first two sentences as a safety net.
    return parts.slice(0, 2).join(" ");
  }
  return joined;
}
