import Constants from "expo-constants";
import { Platform } from "react-native";

const BACKEND_PORT = 3333;

/**
 * Auto-detect the backend URL based on the Expo dev server host.
 *
 * - iPhone Simulator: uses 127.0.0.1 (shares Mac network)
 * - Android Emulator: uses 10.0.2.2 (Android's alias for host machine)
 * - Physical device: uses the LAN IP that Expo already resolved
 */
function deriveDefaultBackendUrl(): string {
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    "";

  const host = String(hostUri).split(":")[0] || "localhost";

  // Android emulator can't reach the Mac via 127.0.0.1
  if (Platform.OS === "android" && (host === "localhost" || host === "127.0.0.1")) {
    return `http://10.0.2.2:${BACKEND_PORT}`;
  }

  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.startsWith("172.");

  const protocol = isLocal ? "http" : "https";
  return `${protocol}://${host}:${BACKEND_PORT}`;
}

export function getBackendBaseUrl(): string | null {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");
  if (__DEV__) {
    const url = deriveDefaultBackendUrl();
    console.log(`[Backend] Auto-detected URL: ${url}`);
    return url;
  }
  return null;
}

export function hasBackendBaseUrl(): boolean {
  return !!getBackendBaseUrl();
}

/**
 * Canonical web redirect URI for WHOOP OAuth.
 *
 * WHOOP requires an EXACT match against the redirect URIs pre-registered
 * in the WHOOP developer dashboard — any other origin (Vercel preview
 * deploys at *.vercel.app, custom domains, localhost ports, alternative
 * canonical hosts) will be rejected with `redirect_uri mismatch`.
 *
 * We therefore hard-code the production canonical origin and use it for
 * BOTH the initial authorize URL and the subsequent token exchange.
 * Both call sites MUST agree, since WHOOP also enforces equality between
 * the two values during /oauth/token.
 *
 * In development we fall back to the current `window.location.origin`
 * so `npx expo start --web` (localhost:8081) still works after the
 * dev origin is added to the WHOOP dashboard.
 *
 * Native deep link redirects use a separate scheme and are handled
 * inline at each call site — they do not flow through this helper.
 */
export function getWhoopWebRedirectUri(): string {
  const CANONICAL = "https://life-balance-assistant.vercel.app/whoop-auth";
  if (__DEV__) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}/whoop-auth`;
    }
  }
  return CANONICAL;
}

export function getBackendFeatureMessage(): string | null {
  if (hasBackendBaseUrl()) return null;
  return "Backend features are disabled. Set EXPO_PUBLIC_BACKEND_URL to connect.";
}

export async function checkBackendHealth(): Promise<{
  ok: boolean;
  url: string;
  message: string;
  whoopConfigured?: boolean;
  llmConfigured?: boolean;
}> {
  const url = getBackendBaseUrl();
  if (!url) {
    return { ok: false, url: "not configured", message: "No backend URL configured." };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return { ok: false, url, message: `Backend returned ${res.status}` };
    }
    const json = (await res.json()) as { whoopConfigured?: boolean; llmConfigured?: boolean };
    return {
      ok: true,
      url,
      message: "Connected",
      whoopConfigured: json.whoopConfigured,
      llmConfigured: json.llmConfigured,
    };
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "Backend is waking up — try again in a moment" : (e?.message ?? "Backend unreachable");
    return { ok: false, url, message: msg };
  }
}
