// lib/storageKeys.ts
//
// Single source of truth for every AsyncStorage key the app reads or writes.
// Destructive flows (delete-everything, clear plans, kiosk reset) MUST go
// through the catalog below so a new key never silently survives a wipe.
//
// Categories:
//   - records:       per-day check-ins, wearables, LBI, emotion entries
//   - plans:         saved daily plans (prefixed key family)
//   - profile:       identity-shaped fields (values, contexts, name, install date)
//   - settings:      user-tweakable preferences and toggles
//   - consent:       explicit consent records
//   - whoop:         WHOOP integration tokens and sync metadata
//   - tour:          guided-tour completion state
//   - demo:          demo-mode flags and overrides
//   - evaluation:    SUS submissions and participant id
//   - cachePrefixes: prefix families (smart recs, feature guide flags)
//
// When you add a new persistent key, register it here and decide which
// destructive action it should be cleared by. Tests assert this catalog
// contains every literal key referenced from app/lib/components.

import AsyncStorage from "@react-native-async-storage/async-storage";

// --- Records (daily check-ins, wearables, LBI, emotion) ---
export const KEY_DAILY_RECORDS = "life_balance_daily_records_v1";
export const KEY_DAILY_RECORDS_CORRUPT_BACKUP = "life_balance_daily_records_v1:corrupt_backup";
export const KEY_FUTURE_EVENTS = "life_balance_future_events_v1";

// --- Plans (per-date) ---
export const PREFIX_PLAN = "life_balance_plan_v1:";

// --- Profile ---
export const KEY_VALUES = "life_balance_values_v1";
export const KEY_CONTEXT = "life_balance_context_v1";
export const KEY_USER_NAME = "life_balance_user_name_v1";
export const KEY_INSTALL_DATE = "life_balance_install_date_v1";

// --- Settings & preferences ---
export const KEY_RETENTION_DAYS = "retention_days_v1";
export const KEY_EXPORT_REDACT_TEXT = "export_redact_text_v1";
export const KEY_EXPORT_ANONYMIZE_ID = "export_anonymize_id_v1";
export const KEY_LLM_ENABLED = "llm_enabled_v1";
export const KEY_NUDGE_ENABLED = "nudge_enabled_v1";
export const KEY_STREAKS_ENABLED = "streaks_enabled_v1";
export const KEY_PREFERRED_TONE = "preferred_tone_v1";
export const KEY_PRIMARY_GOAL = "primary_goal_v1";
export const KEY_SLEEP_WINDOW = "sleep_window_v1";
export const KEY_DEMO_MODE_FLAG = "demo_mode_flag_v1";
export const KEY_FIRST_LAUNCH_DONE = "first_launch_done_v1";
export const KEY_INSIGHTS_SELECTED_DATE = "life_balance_insights_selected_date_v1";
export const KEY_SCHEDULE = "life_balance_schedule_v1";

// --- Companion modules (habits, reframes, anchors, sleep hygiene, etc.) ---
export const KEY_HABITS = "life_balance_habits_v1";
export const KEY_REFRAMES = "life_balance_reframes_v1";
export const KEY_ANCHORS = "anchors_v1";
export const KEY_SLEEP_HYGIENE = "life_balance_sleep_hygiene_v1";
export const KEY_REFLECTION_FEEDBACK = "reflection_feedback_counts_v1";
export const KEY_WEEKLY_REFLECTION = "life_balance_weekly_reflection_v1";
export const KEY_CUSTOM_TAGS = "life_balance_custom_tags_v1";
export const KEY_ENERGY = "life_balance_energy_v1";
export const KEY_LIFT = "mind_body_lift_v1";

// --- ML / recommendation ---
export const KEY_ML_MODELS = "life_balance_ml_models_v1";
export const KEY_REC_CLASSIFIER = "life_balance_rec_classifier_v1";

// --- Consent ---
export const KEY_APP_CONSENT = "app_consent_v1";
export const KEY_WHOOP_CONSENT = "whoop_consent_v1";

// --- WHOOP integration ---
export const KEY_WHOOP_SESSION = "whoop_session_token";
export const KEY_WHOOP_PARTICIPANT = "whoop_participant_id";
export const KEY_WHOOP_LAST_SYNC = "whoop_last_sync";
export const KEY_WHOOP_LAST_SYNC_AT = "whoop_last_sync_at";
export const KEY_WHOOP_DEMO_FLAG = "whoop_demo_active_v1";

// --- Tour (guided onboarding overlays) ---
export const KEY_TOUR_COMPLETED = "life_balance_tour_completed_v2";
export const KEY_TOUR_STEP = "life_balance_tour_step_v2";
// Legacy v1 keys kept here so destructive flows can scrub them too.
export const KEY_TOUR_COMPLETED_V1 = "life_balance_tour_completed_v1";
export const KEY_TOUR_STEP_V1 = "life_balance_tour_step_v1";

// --- Welcome / first-run ---
export const KEY_WELCOME_SEEN = "welcome_seen_v1";
export const KEY_FIRST_RUN_DONE = "first_run_done_v1";

// --- Demo / examiner mode ---
export const KEY_DEMO_ENABLED = "demo_enabled_v1";
export const KEY_DEMO_OVERRIDE_CHECKIN = "demo_override_checkin_v1";
export const KEY_DEMO_OVERRIDE_WEARABLE = "demo_override_wearable_v1";
export const KEY_DEMO_MODE_CHOICE = "demo_mode_choice_v1";

// --- Evaluation (SUS) ---
export const KEY_SUS_RESPONSES = "life_balance_sus_responses_v1";
export const KEY_SUS_PARTICIPANT = "life_balance_participant_id_v1";

// --- Prefix families ---
export const PREFIX_SMART_REC = "life_balance_smart_rec_";
export const PREFIX_FEATURE_GUIDE = "feature_guide_seen_";

// ---------------------------------------------------------------------------
// Curated "all keys" used by destructive flows.
// ---------------------------------------------------------------------------

const FIXED_KEYS_ALL: readonly string[] = [
  // records
  KEY_DAILY_RECORDS,
  KEY_DAILY_RECORDS_CORRUPT_BACKUP,
  KEY_FUTURE_EVENTS,
  // profile
  KEY_VALUES,
  KEY_CONTEXT,
  KEY_USER_NAME,
  KEY_INSTALL_DATE,
  // settings
  KEY_RETENTION_DAYS,
  KEY_EXPORT_REDACT_TEXT,
  KEY_EXPORT_ANONYMIZE_ID,
  KEY_LLM_ENABLED,
  KEY_NUDGE_ENABLED,
  KEY_STREAKS_ENABLED,
  KEY_PREFERRED_TONE,
  KEY_PRIMARY_GOAL,
  KEY_SLEEP_WINDOW,
  KEY_DEMO_MODE_FLAG,
  KEY_FIRST_LAUNCH_DONE,
  KEY_INSIGHTS_SELECTED_DATE,
  KEY_SCHEDULE,
  // companions
  KEY_HABITS,
  KEY_REFRAMES,
  KEY_ANCHORS,
  KEY_SLEEP_HYGIENE,
  KEY_REFLECTION_FEEDBACK,
  KEY_WEEKLY_REFLECTION,
  KEY_CUSTOM_TAGS,
  KEY_ENERGY,
  KEY_LIFT,
  // ML
  KEY_ML_MODELS,
  KEY_REC_CLASSIFIER,
  // consent
  KEY_APP_CONSENT,
  KEY_WHOOP_CONSENT,
  // WHOOP
  KEY_WHOOP_SESSION,
  KEY_WHOOP_PARTICIPANT,
  KEY_WHOOP_LAST_SYNC,
  KEY_WHOOP_LAST_SYNC_AT,
  KEY_WHOOP_DEMO_FLAG,
  // tour (current + legacy)
  KEY_TOUR_COMPLETED,
  KEY_TOUR_STEP,
  KEY_TOUR_COMPLETED_V1,
  KEY_TOUR_STEP_V1,
  // demo
  KEY_DEMO_ENABLED,
  KEY_DEMO_OVERRIDE_CHECKIN,
  KEY_DEMO_OVERRIDE_WEARABLE,
  KEY_DEMO_MODE_CHOICE,
  // evaluation
  KEY_SUS_RESPONSES,
  KEY_SUS_PARTICIPANT,
];

const KNOWN_PREFIXES: readonly string[] = [
  PREFIX_PLAN,
  PREFIX_SMART_REC,
  PREFIX_FEATURE_GUIDE,
];

/**
 * Resolve every storage key currently present in AsyncStorage that the app
 * is allowed to delete. Includes:
 *   - Every fixed key registered in this catalog
 *   - Any key that starts with a registered prefix family
 *
 * Used by destructive flows that promise "wipe all local data". Web and
 * native both implement getAllKeys, so this stays cross-platform.
 */
export async function resolveAllAppKeys(): Promise<string[]> {
  const live = await AsyncStorage.getAllKeys();
  const set = new Set<string>(FIXED_KEYS_ALL);
  for (const k of live) {
    if (KNOWN_PREFIXES.some((p) => k.startsWith(p))) {
      set.add(k);
    }
  }
  return Array.from(set);
}

/** Welcome / onboarding gates only — used by Replay welcome. */
export const ONBOARDING_GATE_KEYS: readonly string[] = [
  KEY_WELCOME_SEEN,
  KEY_APP_CONSENT,
  KEY_FIRST_RUN_DONE,
  KEY_TOUR_COMPLETED,
  KEY_TOUR_STEP,
  KEY_TOUR_COMPLETED_V1,
  KEY_TOUR_STEP_V1,
];
