import fs from "fs/promises";
import path from "path";
import { URLSearchParams } from "url";
import crypto from "crypto";

export type WearableDay = {
  recovery: number | null;
  sleepHours: number | null;
  strain: number | null;
  source: "WHOOP";
  syncedAt: string;
};

type TokenRecord = {
  sessionId: string;
  participantId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  sessionExpiresAt: number; // epoch ms
};

const DATA_DIR = path.resolve(process.cwd(), ".data");
const TOKENS_PATH = path.join(DATA_DIR, "whoopTokens.json");
const CACHE_PATH = path.join(DATA_DIR, "whoopDayCache.json");
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v1";
const REQUEST_TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const STORE_KEY = process.env.WHOOP_STORE_KEY || "";

function getKey(): Buffer | null {
  if (!STORE_KEY) return null;
  return crypto.createHash("sha256").update(STORE_KEY).digest();
}

function encryptPayload(input: string): string {
  const key = getKey();
  if (!key) return input;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(input, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

function decryptPayload(input: string): string {
  if (!input.startsWith("enc:v1:")) return input;
  const key = getKey();
  if (!key) throw new Error("Encrypted WHOOP token store found but WHOOP_STORE_KEY is missing.");
  const [, , ivB64, tagB64, encB64] = input.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

async function ensureStore(): Promise<Record<string, TokenRecord>> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(TOKENS_PATH, "utf8");
    const plain = decryptPayload(raw);
    return JSON.parse(plain) as Record<string, TokenRecord>;
  } catch (err: any) {
    if (err.code === "ENOENT") return {};
    return {};
  }
}

async function saveStore(store: Record<string, TokenRecord>) {
  const raw = JSON.stringify(store, null, 2);
  await fs.writeFile(TOKENS_PATH, encryptPayload(raw), "utf8");
}

function fetchWithTimeout(url: string, init: any = {}, timeout = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const merged = { ...init, signal: controller.signal };
  return fetch(url, merged).finally(() => clearTimeout(id));
}

function genId() {
  return crypto.randomBytes(24).toString("hex");
}

export async function storeTokens(sessionId: string, participantId: string, tokens: { access_token: string; refresh_token: string; expires_in: number }) {
  const store = await ensureStore();
  const expiresAt = Date.now() + tokens.expires_in * 1000 - 30_000; // early skew
  const existingSession = store[sessionId]?.sessionExpiresAt;
  store[sessionId] = {
    sessionId,
    participantId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    sessionExpiresAt: existingSession ?? Date.now() + SESSION_TTL_MS,
  };
  await saveStore(store);
}

export async function deleteTokens(sessionId: string) {
  const store = await ensureStore();
  if (store[sessionId]) {
    delete store[sessionId];
    await saveStore(store);
  }
}

async function getTokens(sessionId: string): Promise<TokenRecord | null> {
  const store = await ensureStore();
  const rec = store[sessionId] ?? null;
  if (rec && rec.sessionExpiresAt < Date.now()) {
    delete store[sessionId];
    await saveStore(store);
    return null;
  }
  return rec;
}

async function refreshToken(sessionId: string, clientId: string, clientSecret: string) {
  const record = await getTokens(sessionId);
  if (!record) throw new Error("No token stored");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: record.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetchWithTimeout(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Refresh failed ${res.status}`);
  const json = (await res.json()) as any;
  await storeTokens(sessionId, record.participantId, json);
  return json;
}

export async function exchangeCode(participantId: string | null, code: string, redirectUri: string, clientId: string, clientSecret: string) {
  const safePid = participantId && participantId.trim() ? participantId : genId();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetchWithTimeout(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed ${res.status}`);
  const json = (await res.json()) as any;
  const sessionId = genId();
  await storeTokens(sessionId, safePid, json);
  return sessionId;
}

export async function refreshWhoopSession(sessionId: string, clientId: string, clientSecret: string): Promise<boolean> {
  const existing = await getTokens(sessionId);
  if (!existing) return false;
  await refreshToken(sessionId, clientId, clientSecret);
  return true;
}

export function normalizeCycleToWearable(cycle: any): WearableDay | null {
  if (!cycle) return null;
  const nowIso = new Date().toISOString();
  const recoveryRaw =
    cycle?.score?.recovery_score?.recovery_score ??
    cycle?.score?.recovery_score ??
    cycle?.score?.recovery ??
    null;
  const sleepSeconds =
    cycle?.score?.sleep_awake_time_state_times?.asleep ??
    cycle?.score?.sleep_performance_total ?? // fallback
    cycle?.score?.sleep_need ?? null;
  const sleepHours = sleepSeconds != null ? Math.round((sleepSeconds / 3600) * 10) / 10 : null;
  const strainRaw = cycle?.score?.strain ?? cycle?.score?.strain_score ?? null;

  const recovery = recoveryRaw == null ? null : Math.max(0, Math.min(100, Math.round(recoveryRaw)));
  const strain = strainRaw == null ? null : Number(strainRaw);

  if (recovery == null && sleepHours == null && strain == null) return null;

  return {
    recovery,
    sleepHours,
    strain,
    source: "WHOOP",
    syncedAt: nowIso,
  };
}

function cacheKey(sessionId: string, date: string) {
  return `${sessionId}|${date}`;
}

const dayCache = new Map<string, { data: WearableDay; cachedAt: number }>();

async function loadCacheFromDisk() {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Record<string, { data: WearableDay; cachedAt: number }>;
    for (const [k, v] of Object.entries(parsed)) {
      dayCache.set(k, v);
    }
  } catch (err: any) {
    /* ignore */
  }
}

async function persistCacheToDisk() {
  const obj: Record<string, { data: WearableDay; cachedAt: number }> = {};
  for (const [k, v] of dayCache.entries()) obj[k] = v;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(obj, null, 2), "utf8");
}

loadCacheFromDisk();

async function whoopGet(accessToken: string, path: string): Promise<any> {
  const res = await fetchWithTimeout(`${WHOOP_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`WHOOP API error ${res.status} ${path}:`, errBody);
    if (res.status === 401) throw Object.assign(new Error("unauthorized"), { statusCode: 401 });
    if (res.status === 404) return null; // endpoint returned no data
    throw new Error(`WHOOP API error ${res.status}: ${errBody.slice(0, 200)}`);
  }
  return res.json();
}

export async function getWhoopDay(sessionId: string, date: string, clientId: string, clientSecret: string): Promise<WearableDay | null> {
  const key = cacheKey(sessionId, date);
  const cached = dayCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  let record = await getTokens(sessionId);
  if (!record) throw new Error("Not connected to WHOOP");
  if (Date.now() > record.expiresAt) {
    await refreshToken(sessionId, clientId, clientSecret);
    record = await getTokens(sessionId);
  }
  if (!record) throw new Error("Token missing after refresh");

  try {
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;
    const qs = `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

    // Step 1: Fetch cycle and sleep in parallel
    const [cycleJson, sleepJson] = await Promise.all([
      whoopGet(record.accessToken, `/cycle${qs}`),
      whoopGet(record.accessToken, `/activity/sleep${qs}`),
    ]);

    const cycle = cycleJson?.records?.[0] ?? null;

    // Step 2: If we have a cycle, fetch its recovery
    let recovery: any = null;
    if (cycle?.id) {
      recovery = await whoopGet(record.accessToken, `/cycle/${cycle.id}/recovery`);
    }

    const sleep = sleepJson?.records?.[0] ?? null;

    const recoveryScore = recovery?.score?.recovery_score ?? null;
    const sleepMs = sleep?.score?.total_sleep_duration ?? sleep?.score?.stage_summary?.total_in_bed_time_milli ?? null;
    const sleepHours = sleepMs != null ? Math.round((sleepMs / 3_600_000) * 10) / 10 : null;
    const strain = cycle?.score?.strain ?? null;

    if (recoveryScore == null && sleepHours == null && strain == null) return null;

    const wearable: WearableDay = {
      recovery: recoveryScore != null ? Math.max(0, Math.min(100, Math.round(recoveryScore))) : null,
      sleepHours,
      strain: strain != null ? Number(strain) : null,
      source: "WHOOP",
      syncedAt: new Date().toISOString(),
    };

    dayCache.set(key, { data: wearable, cachedAt: Date.now() });
    await persistCacheToDisk();
    return wearable;
  } catch (err: any) {
    if (err?.statusCode === 401) {
      await refreshToken(sessionId, clientId, clientSecret);
      return getWhoopDay(sessionId, date, clientId, clientSecret);
    }
    throw err;
  }
}
