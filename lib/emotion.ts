import type { RegulationState, EmotionValue, ISODate } from "./types";
import { listEmotions, getEmotion } from "./storage";
import { todayISO } from "./util/todayISO";

export type WeeklyEmotionAggregate = {
  weekOf: ISODate;
  entries: number;
  quadrantCounts: { pleasantCalm: number; pleasantActivated: number; unpleasantCalm: number; unpleasantActivated: number };
  meanValence: number;
  meanArousal: number;
  intensityMean: number;
  regulationCounts: Record<RegulationState, number>;
  valueFrequency: Record<EmotionValue, number>;
  valueByQuadrant: Record<EmotionValue, WeeklyEmotionAggregate["quadrantCounts"]>;
  valueByRecoveryBand: Record<EmotionValue, { low: number; mid: number; high: number }>;
};

export function deriveIntensity(valence: number, arousal: number): number {
  const r = Math.sqrt(valence * valence + arousal * arousal);
  return Math.min(1, r);
}

export function quadrantOf(val: number, aro: number): keyof WeeklyEmotionAggregate["quadrantCounts"] {
  const pleasant = val >= 0;
  const activated = aro >= 0;
  if (pleasant && !activated) return "pleasantCalm";
  if (pleasant && activated) return "pleasantActivated";
  if (!pleasant && !activated) return "unpleasantCalm";
  return "unpleasantActivated";
}

function recoveryBand(recovery?: number): "low" | "mid" | "high" {
  if (recovery == null) return "mid";
  if (recovery < 40) return "low";
  if (recovery > 70) return "high";
  return "mid";
}

export async function computeWeeklyAggregate(weekOf: ISODate, recoveryByDate: Record<ISODate, number | undefined>): Promise<WeeklyEmotionAggregate> {
  const emotions = await listEmotions(90);
  const inWeek = emotions.filter((e) => {
    const d = new Date(e.date);
    const start = new Date(weekOf);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return d >= start && d < end;
  });

  const agg: WeeklyEmotionAggregate = {
    weekOf,
    entries: inWeek.length,
    quadrantCounts: { pleasantCalm: 0, pleasantActivated: 0, unpleasantCalm: 0, unpleasantActivated: 0 },
    meanValence: 0,
    meanArousal: 0,
    intensityMean: 0,
    regulationCounts: { handled: 0, manageable: 0, overwhelmed: 0 },
    valueFrequency: {},
    valueByQuadrant: {},
    valueByRecoveryBand: {},
  };

  if (!inWeek.length) return agg;

  inWeek.forEach((e) => {
    agg.meanValence += e.valence;
    agg.meanArousal += e.arousal;
    agg.intensityMean += e.intensity;
    agg.regulationCounts[e.regulation] += 1;

    const q = quadrantOf(e.valence, e.arousal);
    agg.quadrantCounts[q] += 1;

    agg.valueFrequency[e.valueChosen] = (agg.valueFrequency[e.valueChosen] ?? 0) + 1;
    if (!agg.valueByQuadrant[e.valueChosen]) {
      agg.valueByQuadrant[e.valueChosen] = { pleasantCalm: 0, pleasantActivated: 0, unpleasantCalm: 0, unpleasantActivated: 0 };
    }
    agg.valueByQuadrant[e.valueChosen][q] += 1;

    const band = recoveryBand(recoveryByDate[e.date]);
    if (!agg.valueByRecoveryBand[e.valueChosen]) {
      agg.valueByRecoveryBand[e.valueChosen] = { low: 0, mid: 0, high: 0 };
    }
    agg.valueByRecoveryBand[e.valueChosen][band] += 1;
  });

  const n = inWeek.length;
  agg.meanValence /= n;
  agg.meanArousal /= n;
  agg.intensityMean /= n;
  return agg;
}

export async function buildLlmPayload(date: ISODate, recovery?: number) {
  const entry = await getEmotion(date);
  if (!entry) return null;
  const last7 = await listEmotions(7);
  const valueTop = Object.entries(
    last7.reduce<Record<string, number>>((acc, e) => {
      acc[e.valueChosen] = (acc[e.valueChosen] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([value, count]) => ({ value, count }));

  const quadrantHint = quadrantOf(entry.valence, entry.arousal)
    .replace("pleasant", "pleasant-")
    .replace("unpleasant", "unpleasant-") as
    | "pleasant-calm"
    | "pleasant-activated"
    | "unpleasant-calm"
    | "unpleasant-activated";

  return {
    date,
    valence: entry.valence,
    arousal: entry.arousal,
    intensity: entry.intensity,
    regulation: entry.regulation,
    contextTags: entry.contextTags,
    valueChosen: entry.valueChosen,
    reflection: entry.reflection,
    recoveryBand: recovery == null ? undefined : recoveryBand(recovery),
    recentStats: {
      last7Count: last7.length,
      valueTop,
      regulationSkew: null as null | typeof entry.regulation,
      quadrantHint,
    },
  };
}

export function defaultValuesSet(): EmotionValue[] {
  return ["Growth", "Connection", "Health", "Peace", "Discipline", "Purpose"];
}

export async function ensureTodayEmotionPlaceholder(date = todayISO()) {
  const existing = await getEmotion(date);
  if (existing) return existing;
  return null;
}
