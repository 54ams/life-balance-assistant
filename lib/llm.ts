// lib/llm.ts
import Constants from "expo-constants";
import { LLM_ENABLED_KEY, containsSelfHarmSignals, getBooleanSetting } from "./privacy";
import { getBackendBaseUrl } from "./backend";

/**
 * Avoid hardcoding LAN IPs.
 * - If you set EXPO_PUBLIC_LLM_URL, we use it.
 * - Otherwise, in development we derive the host from the Expo dev server.
 *
 * Backend default: http://<host>:3333/explain
 */
function getDefaultLlmUrl() {
  // 1) Explicit env (recommended)
  const envUrl = process.env.EXPO_PUBLIC_LLM_URL;
  if (envUrl) return envUrl;

  const backendUrl = getBackendBaseUrl();
  if (backendUrl) return `${backendUrl}/explain`;

  if (!__DEV__) return null;

  // 2) Try derive host from Expo dev server
  const hostUri =
    // SDKs differ slightly in where this lives; try a few.
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    "";

  // hostUri examples:
  // - "192.168.1.148:19000"
  // - "localhost:19000"
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

export async function generateExplanation(prompt: string, context?: string) {
  const enabled = await getBooleanSetting(LLM_ENABLED_KEY, true);
  if (!enabled) return null;

  const LLM_URL = getDefaultLlmUrl();
  if (!LLM_URL) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(LLM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, context }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`LLM error ${res.status}`);

    const data = (await res.json()) as { text?: string };
    return data.text ?? null;
  } catch (err) {
    console.error("LLM failed:", err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function reflectEmotion(payload: any) {
  const textForSafety = JSON.stringify(payload ?? {}).toLowerCase();
  if (containsSelfHarmSignals(textForSafety)) {
    return "This reflection is paused for safety. If you need support, please contact Samaritans on 116 123 (UK) or emergency services.";
  }

  const system = `You are a warm, observational reflection assistant for a wellbeing app.
Tone: calm, encouraging, validating, non-clinical. No advice, no diagnosis, no “should/must/try”.
Write in plain English that anyone can understand — no jargon, no technical terms.
Write 2-3 short sentences (max 80 words).

Reflect on today’s emotional snapshot:
- Describe the emotional state in everyday words (e.g. “feeling calm and positive” not “pleasant-calm quadrant”).
- Acknowledge how they’re managing (regulation state) in natural language.
- Connect to the value they chose — make it feel personal and meaningful.
- If context tags exist, weave them in naturally.
- If recoveryBand exists, mention it gently as background context, not a cause.

Use hedges like “it seems like”, “it looks like”, “this might reflect”.
Never give instructions or set goals.`;

  const prompt = `data:${JSON.stringify(payload)}`;
  return generateExplanation(system, prompt);
}
