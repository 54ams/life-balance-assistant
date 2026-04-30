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
