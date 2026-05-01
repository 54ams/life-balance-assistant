// lib/privacy.ts
//
// Consent, data retention, tone preferences, and the safety gate.
//
// I keep all of the privacy-touching state in this single file so it is
// easy for me to point to in the viva when I am asked "where exactly is
// consent stored?" and "how do you delete everything?".
//
// What lives here:
//   - Versioned consent record (APP_CONSENT_KEY) with explicit items
//     for processing, WHOOP import, research export, non-medical use.
//   - withdrawAllConsent(): single button call that clears the local
//     store, the WHOOP session, the SUS submissions, and every consent
//     flag. This is the "delete all my data" path used by Profile.
//   - Retention window (7..365 days, default 90) — used by the
//     scheduled purge so anything older than the window goes away.
//   - Boolean toggles (LLM, nudges, streaks) used across the app to
//     gate optional features without scattering AsyncStorage keys.
//   - hashParticipantId(): small DJB2 hash so the optional research
//     export carries a stable but de-identified ID — there is no
//     personally identifying field stored anywhere on disk.
//   - containsSelfHarmSignals(): the self-harm trigger word check.
//     I use it to gate the LLM call (paused → safety message instead)
//     and to surface signposting at save time.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAll, purgeOldData } from "./storage";
import { clearSusSubmissions, purgeOldSusSubmissions } from "./evaluation/storage";

export const APP_CONSENT_KEY = "app_consent_v1";
export const WHOOP_CONSENT_KEY = "whoop_consent_v1";
export const RETENTION_DAYS_KEY = "retention_days_v1";
export const EXPORT_REDACT_TEXT_KEY = "export_redact_text_v1";
export const EXPORT_ANONYMIZE_ID_KEY = "export_anonymize_id_v1";
export const LLM_ENABLED_KEY = "llm_enabled_v1";
export const NUDGE_ENABLED_KEY = "nudge_enabled_v1";
export const STREAKS_ENABLED_KEY = "streaks_enabled_v1";
export const PREFERRED_TONE_KEY = "preferred_tone_v1";
export const PRIMARY_GOAL_KEY = "primary_goal_v1";
export const SLEEP_WINDOW_KEY = "sleep_window_v1";
export const DEMO_MODE_FLAG_KEY = "demo_mode_flag_v1";
export const FIRST_LAUNCH_DONE_KEY = "first_launch_done_v1";

export type PreferredTone = "Gentle" | "Direct" | "Playful";
export type SleepWindow = "Early bird" | "Standard" | "Night owl" | "Shift worker";
export type PrimaryGoal =
  | "Sleep quality"
  | "Stress recovery"
  | "Consistent energy"
  | "Emotional awareness"
  | "Physical activity"
  | "Mindful eating";

export type AppConsent = {
  consentedAt: string;
  privacyVersion: string;
  items: {
    dataProcessing: boolean;
    whoopImport: boolean;
    exportForResearch: boolean;
    nonMedicalUse: boolean;
  };
};

export async function getAppConsent(): Promise<AppConsent | null> {
  const raw = await AsyncStorage.getItem(APP_CONSENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppConsent;
  } catch {
    return null;
  }
}

export async function saveAppConsent(consent: AppConsent): Promise<void> {
  await AsyncStorage.setItem(APP_CONSENT_KEY, JSON.stringify(consent));
}

/**
 * Wipe every piece of local data the app owns. I call this when the
 * user taps "delete all my data" in Profile → Privacy. Order matters:
 * clear the daily records first, then the SUS submissions, then the
 * consent flags themselves so the app reverts to a clean first-run
 * state. WHOOP session keys are removed here too so the next launch
 * cannot accidentally re-pull data on a stale token.
 */
export async function withdrawAllConsent(): Promise<void> {
  await clearAll();
  await clearSusSubmissions();
  await AsyncStorage.multiRemove([
    APP_CONSENT_KEY,
    WHOOP_CONSENT_KEY,
    "whoop_session_token",
    "whoop_last_sync",
    "whoop_last_sync_at",
  ]);
}

export async function getRetentionDays(): Promise<number> {
  const raw = await AsyncStorage.getItem(RETENTION_DAYS_KEY);
  const n = raw ? Number(raw) : 90;
  if (!Number.isFinite(n) || n <= 0) return 90;
  return Math.round(n);
}

export async function setRetentionDays(days: number): Promise<void> {
  const safe = Math.max(7, Math.min(365, Math.round(days)));
  await AsyncStorage.setItem(RETENTION_DAYS_KEY, String(safe));
}

export async function runRetentionPurgeNow(): Promise<{
  recordsRemoved: number;
  plansRemoved: number;
  futureEventsRemoved: number;
  susRemoved: number;
}> {
  const days = await getRetentionDays();
  const core = await purgeOldData(days);
  const susRemoved = await purgeOldSusSubmissions(days);
  return { ...core, susRemoved };
}

export async function getBooleanSetting(key: string, fallback: boolean): Promise<boolean> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return fallback;
  return raw === "1";
}

export async function setBooleanSetting(key: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key, value ? "1" : "0");
}

/**
 * DJB2 hash → "p_<hex>" pseudonym used for research export. Not a
 * cryptographic primitive — its only job is to give a stable but
 * de-identified label so a participant's exports group together
 * without exposing the raw id. The app never stores a real name or
 * email, so even the input here is typically a generated string.
 */
export function hashParticipantId(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return `p_${(h >>> 0).toString(16)}`;
}

export async function getPreferredTone(): Promise<PreferredTone> {
  const raw = await AsyncStorage.getItem(PREFERRED_TONE_KEY);
  if (raw === "Direct" || raw === "Playful") return raw;
  return "Gentle";
}

export async function setPreferredTone(tone: PreferredTone): Promise<void> {
  await AsyncStorage.setItem(PREFERRED_TONE_KEY, tone);
}

export async function getPrimaryGoals(): Promise<PrimaryGoal[]> {
  const raw = await AsyncStorage.getItem(PRIMARY_GOAL_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PrimaryGoal[]) : [];
  } catch {
    return [];
  }
}

export async function setPrimaryGoals(goals: PrimaryGoal[]): Promise<void> {
  const unique = Array.from(new Set(goals)).slice(0, 2);
  await AsyncStorage.setItem(PRIMARY_GOAL_KEY, JSON.stringify(unique));
}

export async function getSleepWindow(): Promise<SleepWindow | null> {
  const raw = await AsyncStorage.getItem(SLEEP_WINDOW_KEY);
  if (raw === "Early bird" || raw === "Standard" || raw === "Night owl" || raw === "Shift worker") {
    return raw;
  }
  return null;
}

export async function setSleepWindow(window: SleepWindow): Promise<void> {
  await AsyncStorage.setItem(SLEEP_WINDOW_KEY, window);
}

/**
 * Lightweight keyword check used as a safety gate.
 *
 * I run this on the check-in note before the LLM call (so the model
 * never sees the content) and again at save time (so the app can show
 * crisis support links). It is intentionally simple — false positives
 * are acceptable here, false negatives would be much worse, and the
 * scope of a student prototype rules out anything more sophisticated.
 *
 * Limitations are stated honestly in the dissertation: this is not a
 * clinical risk classifier, and the app does not claim to detect or
 * manage crisis events.
 */
export function containsSelfHarmSignals(text: string): boolean {
  const t = text.toLowerCase();
  const needles = [
    "suicide",
    "kill myself",
    "self harm",
    "self-harm",
    "end my life",
    "hurt myself",
  ];
  return needles.some((n) => t.includes(n));
}
