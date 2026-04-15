import { computeBaseline } from "./baseline";
import { calculateLBI, type LbiOutput } from "./lbi";
import { trainIfReady } from "./ml/models";
import { generatePlan, type GeneratedPlan } from "./plan";
import { getActiveValues, getDay, getLifeContexts, loadPlan, savePlan, upsertLBI } from "./storage";
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
  const values = await getActiveValues();
  const lifeContexts = await getLifeContexts();
  const generated = generatePlan({
    lbi: lbi.lbi,
    baseline,
    classification: lbi.classification,
    confidence: lbi.confidence,
    wearable: day.wearable,
    checkIn: day.checkIn ?? null,
    values,
    lifeContexts,
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

  return { lbi, baseline, plan: generated };
}
