import Constants from "expo-constants";

function deriveDefaultBackendUrl() {
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
  return `${protocol}://${host}:3333`;
}

export function getBackendBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");
  if (__DEV__) return deriveDefaultBackendUrl();
  return null;
}

export function hasBackendBaseUrl() {
  return !!getBackendBaseUrl();
}

export function getBackendFeatureMessage() {
  if (hasBackendBaseUrl()) return null;
  return "Backend features are disabled in this build until EXPO_PUBLIC_BACKEND_URL points to a deployed backend.";
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
    return {
      ok: false,
      url: "not configured",
      message: "No backend URL configured for this build.",
    };
  }
  try {
    const res = await fetch(`${url}/health`);
    if (!res.ok) {
      return { ok: false, url, message: `Backend responded ${res.status}` };
    }
    const json = (await res.json()) as { whoopConfigured?: boolean; llmConfigured?: boolean };
    return {
      ok: true,
      url,
      message: "Backend reachable",
      whoopConfigured: json.whoopConfigured,
      llmConfigured: json.llmConfigured,
    };
  } catch (e: any) {
    return { ok: false, url, message: e?.message ?? "Backend unreachable" };
  }
}
