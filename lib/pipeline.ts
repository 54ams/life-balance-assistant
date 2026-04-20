import AsyncStorage from "@react-native-async-storage/async-storage";
import { computeBaseline } from "./baseline";
import { calculateLBI, type LbiOutput } from "./lbi";
import { trainIfReady } from "./ml/models";
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
