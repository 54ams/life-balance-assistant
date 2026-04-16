// lib/llm.ts
import Constants from "expo-constants";
import {
  LLM_ENABLED_KEY,
  containsSelfHarmSignals,
  getBooleanSetting,
  getPreferredTone,
} from "./privacy";
import { getBackendBaseUrl } from "./backend";
import { templateReflection, type ReflectionInput, type ReflectionTone } from "./llm/fallback";

/**
 * LLM client for the Life Balance app.
 *
 * Design:
 *   - Prefer the remote backend (`/explain`, OpenAI gpt-4o-mini).
 *   - If the backend is unreachable, timed out, disabled, or returns an
 *     error, fall back to a deterministic local template so the UX never
 *     appears broken (important for the viva demo where Wi-Fi is not
 *     guaranteed).
 *   - Every call returns `{ text, source }` where `source` is either
 *     "remote" (came from the LLM backend) or "local" (template fallback).
 *     The UI can render a subtle "offline reflection" badge when `source`
 *     is "local".
 *   - Safety gate (self-harm language) runs before both the remote call
 *     and the local fallback.
 */

export type ReflectionSource = "remote" | "local" | "safety";
export type ReflectionResult = { text: string; source: ReflectionSource };

const SAFETY_MESSAGE =
  "Reflection is paused for safety. If you need someone to talk to, Samaritans are free any time on 116 123. In an emergency call 999.";

function getDefaultLlmUrl(): string | null {
  const envUrl = process.env.EXPO_PUBLIC_LLM_URL;
  if (envUrl) return envUrl;

  const backendUrl = getBackendBaseUrl();
  if (backendUrl) return `${backendUrl}/explain`;

  if (!__DEV__) return null;

  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    "";

  const host = String(hostUri).split(":")[0] || "localhost";
  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.startsWith("172.16.");
  const protocol = isLocalHost ? "http" : "https";
  return `${protocol}://${host}:3333/explain`;
}

/**
 * Low-level remote call. Returns the text on success, or null on any
 * failure (network, non-2xx, timeout, parse error, disabled toggle).
 * Does NOT throw to callers — designed to be used with a fallback.
 */
export async function generateExplanation(prompt: string, context?: string): Promise<string | null> {
  const enabled = await getBooleanSetting(LLM_ENABLED_KEY, true);
  if (!enabled) return null;

  const url = getDefaultLlmUrl();
  if (!url) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, context }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    return data.text ?? null;
  } catch (err) {
    // Only surface in dev; keep the viva console clean in production.
    if (__DEV__) console.info("[LLM] remote unavailable, using local fallback");
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildSystemPromptForTone(tone: ReflectionTone): string {
  const toneHint =
    tone === "Direct"
      ? "Tone: clear, warm, a little more matter-of-fact. Still non-clinical and validating."
      : tone === "Playful"
        ? "Tone: warm, light, a touch of gentle humour. Still non-clinical and validating."
        : "Tone: calm, encouraging, validating, non-clinical.";
  return `You are a warm, observational reflection assistant for a wellbeing app.
${toneHint} No advice, no diagnosis, no "should/must/try".
Write in plain English that anyone can understand — no jargon, no technical terms.
Write 2-3 short sentences (max 80 words).

Reflect on today's emotional snapshot:
- Describe the emotional state in everyday words (e.g. "feeling calm and positive" not "pleasant-calm quadrant").
- Acknowledge how they're managing (regulation state) in natural language.
- Connect to the value they chose — make it feel personal and meaningful.
- If context tags exist, weave them in naturally.
- If recoveryBand exists, mention it gently as background context, not a cause.

Use hedges like "it seems like", "it looks like", "this might reflect".
Never give instructions or set goals.`;
}

/**
 * Preferred entry point for the emotion reflection feature.
 * Always returns a `ReflectionResult` — never null, never throws.
 *
 * Order of fallbacks:
 *   1. Safety gate (self-harm signals) → returns a safe message, source "safety".
 *   2. Remote backend → source "remote".
 *   3. Local deterministic template → source "local".
 */
export async function reflectEmotion(payload: ReflectionInput): Promise<ReflectionResult> {
  const textForSafety = JSON.stringify(payload ?? {}).toLowerCase();
  if (containsSelfHarmSignals(textForSafety)) {
    return { text: SAFETY_MESSAGE, source: "safety" };
  }

  const tone = await getPreferredTone();
  const system = buildSystemPromptForTone(tone);
  const remote = await generateExplanation(system, `data:${JSON.stringify(payload)}`);
  if (remote && remote.trim().length > 0) {
    return { text: remote.trim(), source: "remote" };
  }

  return { text: templateReflection(payload, tone), source: "local" };
}
