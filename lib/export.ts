// lib/export.ts
//
// Research / data export bundler.
//
// I use this file to gather every piece of data the user has chosen to
// share — daily records, plans, SUS submissions, model evaluation
// results, sensitivity analysis, settings — and emit a single JSON
// bundle. The redaction toggles (text redaction, ID anonymisation) are
// honoured here, so anything sensitive is replaced with a placeholder
// before the bundle is written.
//
// Privacy: the export is initiated only from Profile → Export and
// always shows the user a preview of what is included before they
// share. Nothing leaves the device unless the user explicitly chooses
// a share target.
import { getPlanAdherenceSummary, listPlans, listDailyRecords } from "./storage";
import { listSusSubmissions } from "./evaluation/storage";
import { computeBaselineMeta } from "./baseline";
import { buildAnalyticsSummary, computeAdherenceCorrelation } from "./analytics";
import { runModelEvaluation } from "./ml/eval";
import { DefaultModelConfig } from "./lbi";
import { runSensitivity, stabilityScore } from "./lbiSensitivity";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EXPORT_ANONYMIZE_ID_KEY,
  EXPORT_REDACT_TEXT_KEY,
  LLM_ENABLED_KEY,
  NUDGE_ENABLED_KEY,
  STREAKS_ENABLED_KEY,
  getAppConsent,
  getBooleanSetting,
  getPreferredTone,
  getPrimaryGoals,
  getRetentionDays,
  getSleepWindow,
  hashParticipantId,
} from "./privacy";
import { getActiveValues, getLifeContexts } from "./storage";

export function exportModelSensitivity(): string {
  const sens = runSensitivity(
    { recovery: 60, sleepHours: 7, strain: 10, checkIn: null },
    0.1,
    10
  );
  const sensitivity = {
    samples: sens.length,
    stabilitySd: stabilityScore(sens.map((s) => s.lbi)),
    raw: sens,
    modelConfig: {
      version: DefaultModelConfig.version,
      weights: DefaultModelConfig.weights,
      thresholds: DefaultModelConfig.thresholds,
    },
    generatedAt: new Date().toISOString(),
  };
  return JSON.stringify(sensitivity, null, 2);
}

export async function exportPlans(days: number): Promise<string> {
  const plans = await listPlans(days);
  const records = await listDailyRecords(days);
  const sus = await listSusSubmissions();
  const baseline = await computeBaselineMeta(14);
  let analytics: any = null;
  try {
    analytics = buildAnalyticsSummary(records, 30);
  } catch {}

  let adherenceCorrelation: any = null;
  try {
    adherenceCorrelation = computeAdherenceCorrelation(plans, records);
  } catch {}

  let ml: any = null;
  try {
    ml = await runModelEvaluation();
  } catch (e: any) {
    ml = { error: e?.message ?? "Not enough data" };
  }

  const sens = runSensitivity(
    { recovery: 60, sleepHours: 7, strain: 10, checkIn: null },
    0.1,
    10
  );
  const sensitivity = {
    samples: sens.length,
    stabilitySd: stabilityScore(sens.map((s) => s.lbi)),
  };

  const anonymize = await getBooleanSetting(EXPORT_ANONYMIZE_ID_KEY, true);
  const redactText = await getBooleanSetting(EXPORT_REDACT_TEXT_KEY, true);
  const llmEnabled = await getBooleanSetting(LLM_ENABLED_KEY, true);
  const nudgeEnabled = await getBooleanSetting(NUDGE_ENABLED_KEY, true);
  const streaksEnabled = await getBooleanSetting(STREAKS_ENABLED_KEY, true);
  const retentionDays = await getRetentionDays();
  const consent = await getAppConsent();
  const adherence = await getPlanAdherenceSummary(Math.min(30, Math.max(7, days)));
  const tone = await getPreferredTone();
  const goals = await getPrimaryGoals();
  const sleepWindow = await getSleepWindow();
  const values = await getActiveValues();
  const lifeContexts = await getLifeContexts();
  const participantId = (await AsyncStorage.getItem("whoop_participant_id")) ?? "";
  const participantRef = participantId
    ? anonymize
      ? hashParticipantId(participantId)
      : participantId
    : null;

  const recordsOut = records.map((r) => ({
    ...r,
    checkIn: r.checkIn
      ? {
          ...r.checkIn,
          notes: redactText ? undefined : r.checkIn.notes,
        }
      : null,
    emotion: r.emotion
      ? {
          ...r.emotion,
          reflection: redactText ? undefined : r.emotion.reflection,
        }
      : null,
  }));

  const payload = {
    exportedAt: new Date().toISOString(),
    days,
    exportOptions: { anonymizeParticipantId: anonymize, redactFreeText: redactText },
    ethics: {
      consentRecorded: !!consent,
      consentedAt: consent?.consentedAt ?? null,
      consentVersion: consent?.privacyVersion ?? null,
      retentionDays,
      llmEnabled,
      nudgeEnabled,
      streaksEnabled,
    },
    personalisation: {
      tone,
      goals,
      sleepWindow,
      values,
      lifeContexts,
    },
    adherenceSummary: adherence,
    participantRef,
    plans,
    records: recordsOut,
    sus,
    baseline,
    analytics,
    modelConfig: {
      version: DefaultModelConfig.version,
      weights: DefaultModelConfig.weights,
      thresholds: DefaultModelConfig.thresholds,
      sensitivity,
    },
    modelEvaluation: ml,
    adherenceCorrelation,
  };
  return JSON.stringify(payload, null, 2);
}
