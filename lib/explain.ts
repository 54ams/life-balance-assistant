// lib/explain.ts
import type { DailyRecord } from "./types";
import { calculateLBI } from "./lbi";

type Driver = {
  label: string;
  detail?: string;
  direction: "up" | "down";
  strength: "mild" | "moderate" | "strong";
};

type AccuracyReason = {
  ok: boolean;
  label: string;
  detail: string;
};

import { clamp } from "./util/clamp";

function strengthFromDelta(delta: number): Driver["strength"] {
  const d = Math.abs(delta);
  if (d >= 25) return "strong";
  if (d >= 12) return "moderate";
  return "mild";
}

function formatHours(h: number) {
  const hr = Math.floor(h);
  const min = Math.round((h - hr) * 60);
  return min === 0 ? `${hr}h` : `${hr}h ${min}m`;
}

/**
 * Build a transparent, rule-based explanation for a single day.
 * This is intentionally *not* an ML model — it mirrors the subscores
 * used by calculateLBI so the UI can explain what happened.
 */
export function buildDayExplain(args: {
  date: string;
  lbi: number;
  baseline: number | null;
  record: DailyRecord | null;
}) {
  const { lbi, baseline, record } = args;

  const wearable = record?.wearable;
  const checkIn = record?.checkIn ?? null;

  const delta = baseline == null ? null : Math.round(lbi - baseline);

  // If we can recompute subscores, we can also explain drivers.
  const lbiOut =
    wearable || checkIn
      ? calculateLBI({
          recovery: wearable?.recovery ?? 0,
          sleepHours: wearable?.sleepHours ?? 0,
          strain: wearable?.strain,
          checkIn,
        })
      : null;

  const subs = lbiOut?.subscores ?? null;

  const drivers: Driver[] = [];

  if (!record) {
    drivers.push({
      label: "No data saved for this day",
      detail: "Add a check-in and/or import wearable data to generate an explanation.",
      direction: "down",
      strength: "strong",
    });
  } else if (!subs) {
    drivers.push({
      label: "Not enough inputs to compute drivers",
      detail: "Add at least a check-in or wearable data.",
      direction: "down",
      strength: "moderate",
    });
  } else {
    // Compare subscores to a neutral reference of 60.
    // (Your LBI logic uses weighted subscores; this keeps the explanation intuitive.)
    const ref = 60;

    const deltas = [
      { key: "recovery", label: "Recovery", value: subs.recovery },
      { key: "sleep", label: "Sleep", value: subs.sleep },
      { key: "mood", label: "Mood", value: subs.mood },
      { key: "stress", label: "Stress", value: subs.stress },
    ].map((x) => ({ ...x, delta: x.value - ref }));

    // Strongest 3 signals
    deltas
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3)
      .forEach((d) => {
        const direction: Driver["direction"] = d.delta >= 0 ? "up" : "down";
        const strength = strengthFromDelta(d.delta);

        let detail: string | undefined;

        if (d.key === "recovery" && wearable && typeof wearable.recovery === "number" && Number.isFinite(wearable.recovery)) {
          detail = `Wearable recovery: ${Math.round(wearable.recovery)}/100.`;
        }
        if (d.key === "sleep" && wearable && typeof wearable.sleepHours === "number" && Number.isFinite(wearable.sleepHours)) {
          detail = `Sleep: ${formatHours(wearable.sleepHours)}.`;
        }
        if (d.key === "mood" && checkIn) {
          const map: Record<number, string> = { 1: "😖", 2: "🙁", 3: "😐", 4: "🙂", 5: "😄" };
          detail = `Mood check-in: ${map[checkIn.mood] ?? checkIn.mood}/5.`;
        }
        if (d.key === "stress" && checkIn) {
          const count = Object.values(checkIn.stressIndicators ?? {}).filter(Boolean).length;
          const level = checkIn.stressLevel ? `Level ${checkIn.stressLevel}/5` : null;
          detail = level ? `${level}. Indicators selected: ${count}.` : `Stress indicators selected: ${count}.`;
        }

        drivers.push({
          label: d.label,
          detail,
          direction,
          strength,
        });
      });

    // If baseline exists, add baseline framing as a mild driver.
    if (delta != null && delta !== 0) {
      drivers.push({
        label: delta > 0 ? "Above baseline" : "Below baseline",
        detail: `Change vs baseline: ${delta > 0 ? "+" : ""}${delta}.`,
        direction: delta > 0 ? "up" : "down",
        strength: strengthFromDelta(delta),
      });
    }
  }

  const accuracyReasons: AccuracyReason[] = [
    {
      ok: !!wearable,
      label: "Wearable signals present",
      detail: wearable
        ? "Recovery and sleep were available for this day."
        : "Import wearables to improve accuracy (sleep/recovery/strain).",
    },
    {
      ok: !!checkIn,
      label: "Daily check-in present",
      detail: checkIn
        ? "Mood and stress indicators were captured."
        : "Add a quick check-in to improve emotional context.",
    },
    {
      ok: baseline != null,
      label: "Baseline available",
      detail:
        baseline != null
          ? `Baseline used: ${baseline}.`
          : "Baseline needs at least 3 recent days with an LBI score.",
    },
  ];

  return {
    lbi: Math.round(clamp(lbi, 0, 100)),
    baseline,
    delta,
    drivers,
    accuracyReasons,
    contextTags: checkIn?.contextTags ?? [],
  };
}

export type Pattern = {
  title: string;
  /** Plain-English one-liner for the front of the tile. */
  detail: string;
  /** Structured breakdown for the "Show my maths" back of the tile. */
  working?: {
    summary: string;
    inputs: string[];
    method: string;
    result: string;
    footnote?: string;
  };
};

/**
 * Very small, transparent "pattern mining" for the Insights screen.
 * This is intentionally simple (summary stats), suitable for a prototype.
 */
export function buildPatterns(days: DailyRecord[]): Pattern[] {
  const usable = days.filter((d) => typeof d.lbi === "number") as Array<DailyRecord & { lbi: number }>;

  if (usable.length < 5) {
    return [
      {
        title: "Not enough history yet",
        detail: "Log a few more days (wearables + check-ins) to unlock pattern insights.",
      },
    ];
  }

  const items: Pattern[] = [];

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  // Mood vs LBI — include all 5 mood levels
  const byMood: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const d of usable) {
    const m = d.checkIn?.mood;
    if (m && byMood[m]) byMood[m].push(d.lbi);
  }
  const moodAvgs = Object.entries(byMood)
    .filter(([, v]) => v.length >= 2)
    .map(([k, v]) => ({ mood: Number(k), mean: Math.round(avg(v)), n: v.length }))
    .sort((a, b) => a.mood - b.mood);

  if (moodAvgs.length >= 2) {
    const low = moodAvgs[0];
    const high = moodAvgs[moodAvgs.length - 1];
    const diff = high.mean - low.mean;
    if (Math.abs(diff) >= 6) {
      const map: Record<number, string> = { 1: "😖", 2: "🙁", 3: "😐", 4: "🙂", 5: "😄" };
      items.push({
        title: "Mood is linked with your balance score",
        detail:
          diff > 0
            ? `Your brighter-mood days tend to come with higher balance scores.`
            : `Your lower-mood days tend to come with higher balance scores.`,
        working: {
          summary: "Comparing your balance score on your best and worst mood days.",
          inputs: [
            `${high.n} days at mood ${map[high.mood] ?? high.mood} (${high.mood}/5)`,
            `${low.n} days at mood ${map[low.mood] ?? low.mood} (${low.mood}/5)`,
          ],
          method:
            "Group days by the mood you gave at check-in, then take the average balance score in each group.",
          result: `Average balance — mood ${map[high.mood] ?? high.mood}: ${high.mean} · mood ${map[low.mood] ?? low.mood}: ${low.mean} · difference ${diff > 0 ? "+" : ""}${diff}`,
          footnote: `Based on ${usable.length} days.`,
        },
      });
    }
  }

  // Sleep vs LBI (split by median)
  const withSleep = usable.filter((d) => typeof d.wearable?.sleepHours === "number");
  if (withSleep.length >= 6) {
    const sleeps = withSleep.map((d) => d.wearable!.sleepHours).sort((a, b) => a - b);
    const mid = Math.floor((sleeps.length - 1) / 2);
    const median = sleeps.length % 2 === 0 ? (sleeps[mid] + sleeps[mid + 1]) / 2 : sleeps[mid];
    const lowGroup = withSleep.filter((d) => d.wearable!.sleepHours <= median).map((d) => d.lbi);
    const highGroup = withSleep.filter((d) => d.wearable!.sleepHours > median).map((d) => d.lbi);
    if (lowGroup.length >= 2 && highGroup.length >= 2) {
      const highMean = Math.round(avg(highGroup));
      const lowMean = Math.round(avg(lowGroup));
      const diff = highMean - lowMean;
      items.push({
        title: "More sleep tends to come with a higher balance score",
        detail:
          diff >= 0
            ? "On your longer-sleep days, your balance score tends to sit a little higher."
            : "Interestingly, your longer-sleep days don't seem to bring a higher balance score.",
        working: {
          summary: "Comparing your balance score on longer-sleep days vs shorter-sleep days.",
          inputs: [
            `${highGroup.length} days with more than ${formatHours(median)} of sleep`,
            `${lowGroup.length} days with ${formatHours(median)} or less`,
          ],
          method:
            "Split your days at your own sleep median, then take the average balance score in each half.",
          result: `Average balance — above median: ${highMean} · at or below: ${lowMean} · difference ${diff > 0 ? "+" : ""}${diff}`,
          footnote: `Based on ${withSleep.length} days with sleep data.`,
        },
      });
    }
  }

  // Recovery vs LBI (split by median)
  const withRec = usable.filter((d) => typeof d.wearable?.recovery === "number");
  if (withRec.length >= 6) {
    const recs = withRec.map((d) => d.wearable!.recovery).sort((a, b) => a - b);
    const mid = Math.floor((recs.length - 1) / 2);
    const median = recs.length % 2 === 0 ? (recs[mid] + recs[mid + 1]) / 2 : recs[mid];
    const lowGroup = withRec.filter((d) => d.wearable!.recovery <= median).map((d) => d.lbi);
    const highGroup = withRec.filter((d) => d.wearable!.recovery > median).map((d) => d.lbi);
    if (lowGroup.length >= 2 && highGroup.length >= 2) {
      const highMean = Math.round(avg(highGroup));
      const lowMean = Math.round(avg(lowGroup));
      const diff = highMean - lowMean;
      items.push({
        title: "Recovery shows up in your balance score",
        detail:
          diff >= 0
            ? "Your better-recovery days tend to come with a higher balance score."
            : "Your better-recovery days don't seem to bring a higher balance score right now.",
        working: {
          summary: "Comparing your balance score on better-recovery vs lower-recovery days.",
          inputs: [
            `${highGroup.length} days with recovery above ${Math.round(median)}`,
            `${lowGroup.length} days with recovery at or below ${Math.round(median)}`,
          ],
          method:
            "Split your days at your own recovery median, then take the average balance score in each half.",
          result: `Average balance — above median: ${highMean} · at or below: ${lowMean} · difference ${diff > 0 ? "+" : ""}${diff}`,
          footnote: `Based on ${withRec.length} days with recovery data.`,
        },
      });
    }
  }

  // Stress indicator count vs LBI
  const withStress = usable.filter((d) => d.checkIn);
  if (withStress.length >= 6) {
    const pairs = withStress.map((d) => {
      const c = Object.values(d.checkIn!.stressIndicators ?? {}).filter(Boolean).length;
      return { count: c, lbi: d.lbi };
    });
    const hi = pairs.filter((p) => p.count >= 3).map((p) => p.lbi);
    const lo = pairs.filter((p) => p.count <= 1).map((p) => p.lbi);
    if (hi.length >= 2 && lo.length >= 2) {
      const loMean = Math.round(avg(lo));
      const hiMean = Math.round(avg(hi));
      const diff = loMean - hiMean;
      items.push({
        title: "Stress shows up too",
        detail:
          diff >= 0
            ? "Lower-stress days tend to come with a higher balance score than days with more ticked."
            : "Counter-intuitively, ticking more stress indicators hasn't lined up with a lower balance score.",
        working: {
          summary: "Comparing balance on days with few stress indicators vs many.",
          inputs: [
            `${lo.length} days with 0–1 stress indicators ticked`,
            `${hi.length} days with 3 or more ticked`,
          ],
          method:
            "Group days by the number of stress indicators you ticked, then take the average balance score in each group.",
          result: `Average balance — low-stress: ${loMean} · high-stress: ${hiMean} · difference ${diff > 0 ? "+" : ""}${diff}`,
          footnote: `Based on ${withStress.length} days with a check-in.`,
        },
      });
    }
  }

  // Cap & fallback
  if (items.length === 0) {
    items.push({
      title: "No strong patterns detected yet",
      detail: "Keep logging consistently for a clearer signal (more days + more complete inputs).",
    });
  }

  return items.slice(0, 6);
}
