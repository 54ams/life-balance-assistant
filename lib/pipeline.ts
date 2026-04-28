import AsyncStorage from "@react-native-async-storage/async-storage";
import { computeBaseline } from "./baseline";
import { calculateLBI, type LbiOutput } from "./lbi";
import { trainIfReady, predictTomorrowRisk } from "./ml/models";
import {
  ensureRecommenderReady,
  predictRecommendationCategory,
  trainRecommender,
} from "./ml/recommender";
import { generatePlan, type GeneratedPlan } from "./plan";
import { getActiveValues, getDay, getLifeContexts, listUpcomingEvents, loadPlan, savePlan, upsertLBI } from "./storage";
import { getPrimaryGoals } from "./privacy";
import { sendBalanceDropNow } from "./notifications";
import { getScheduleForToday } from "./schedule";
import { generateSmartRecommendation, invalidateRecommendation } from "./smartRecommendation";
import type { ISODate } from "./types";

export type DerivedRefreshResult = {
  lbi: LbiOutput | null;
  baseline: number | null;
  plan: GeneratedPlan | null;
};

export async function refreshDerivedForDate(date: ISODate): Promise<DerivedRefreshResult> {
  const day = await getDay(date);
  if (!day?.wearable) {
    return { lbi: null, baseline: null, plan: null };
  }

  const lbi = calculateLBI({
    recovery: day.wearable.recovery,
    sleepHours: day.wearable.sleepHours,
    strain: day.wearable.strain,
    checkIn: day.checkIn ?? null,
  });

  await upsertLBI(date, {
    lbi: lbi.lbi,
    classification: lbi.classification,
    confidence: lbi.confidence,
    reason: lbi.reason,
  });

  const baseline = await computeBaseline(7);
  const [values, lifeContexts, goals, schedule, upcomingEvents] = await Promise.all([
    getActiveValues(),
    getLifeContexts(),
    getPrimaryGoals(),
    getScheduleForToday(),
    listUpcomingEvents(date, 3),
  ]);
  const generated = generatePlan({
    lbi: lbi.lbi,
    baseline,
    classification: lbi.classification,
    confidence: lbi.confidence,
    wearable: day.wearable,
    checkIn: day.checkIn ?? null,
    values,
    lifeContexts,
    goals,
    schedule,
    upcomingEvents,
  });

  const existing = await loadPlan(date);
  await savePlan({
    date,
    lbi: lbi.lbi,
    baseline,
    confidence: lbi.confidence,
    category: generated.category,
    focus: generated.focus,
    actions: generated.actions,
    actionReasons: generated.actionReasons,
    completedActions:
      existing?.actions.length === generated.actions.length ? existing.completedActions : undefined,
    triggers: generated.triggers,
    explanation: generated.explanation,
  });

  await trainIfReady();

  // Train (or refresh) the recommendation classifier. ensureRecommenderReady
  // will train on the cold-start prior at first run; trainRecommender retrains
  // on personal data once enough rows exist. We always retrain here so the
  // model reflects whatever new data the user just logged.
  try {
    await trainRecommender();
  } catch {
    // Training failure is non-fatal — predictRecommendationCategory will
    // still work against the previously cached model (or the cold-start
    // prior via ensureRecommenderReady).
    await ensureRecommenderReady().catch(() => {});
  }

  // Primary ML signal for the recommendation: the category classifier.
  let mlCategory = null as Awaited<ReturnType<typeof predictRecommendationCategory>>;
  try {
    mlCategory = await predictRecommendationCategory();
  } catch {}

  // Secondary ML signal: tomorrow-risk overlay (only fires once the
  // 21-day risk model is trained — see lib/ml/models.ts).
  let mlRisk: { lbiRiskProb: number | null; recoveryRiskProb: number | null; topDrivers: { name: string; direction: "up" | "down"; strength: number }[] } | null = null;
  try {
    const riskResult = await predictTomorrowRisk();
    if (riskResult.trained) {
      mlRisk = {
        lbiRiskProb: riskResult.lbiRiskProb,
        recoveryRiskProb: riskResult.recoveryRiskProb,
        topDrivers: riskResult.topDrivers,
      };
    }
  } catch {}

  // Generate smart recommendation (invalidate stale cache first)
  await invalidateRecommendation(date);
  generateSmartRecommendation({
    date,
    wearable: day.wearable,
    checkIn: day.checkIn ?? null,
    lbi: lbi.lbi,
    lifeContexts,
    schedule,
    upcomingEvents,
    values,
    mlCategory,
    mlRisk,
  }).catch(() => {}); // fire and forget — non-blocking

  // Alert if LBI dropped significantly from baseline (once per day)
  const dropKey = `balance_drop_sent_${date}`;
  const alreadySent = await AsyncStorage.getItem(dropKey);
  if (!alreadySent && baseline != null && lbi.lbi <= baseline - 15) {
    await AsyncStorage.setItem(dropKey, "1");
    sendBalanceDropNow(
      `Your balance dropped to ${lbi.lbi} — that's ${Math.round(baseline - lbi.lbi)} points below your baseline. Worth checking in.`,
    ).catch(() => {});
  }

  return { lbi, baseline, plan: generated };
}
