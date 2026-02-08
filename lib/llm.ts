// lib/llm.ts
import Constants from "expo-constants";

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
  return `http://${host}:3333/explain`;
}

const LLM_URL = getDefaultLlmUrl();

export async function generateExplanation(prompt: string, context?: string) {
  try {
    const res = await fetch(LLM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, context }),
    });

    if (!res.ok) throw new Error(`LLM error ${res.status}`);

    const data = (await res.json()) as { text?: string };
    return data.text ?? null;
  } catch (err) {
    console.error("LLM failed:", err);
    return null;
  }
}
