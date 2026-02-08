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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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

        if (d.key === "recovery" && wearable) {
          detail = `Wearable recovery: ${Math.round(wearable.recovery)}/100.`;
        }
        if (d.key === "sleep" && wearable) {
          detail = `Sleep: ${formatHours(wearable.sleepHours)}.`;
        }
        if (d.key === "mood" && checkIn) {
          const map: Record<number, string> = { 1: "😖", 2: "😐", 3: "🙂", 4: "😄" };
          detail = `Mood check-in: ${map[checkIn.mood] ?? checkIn.mood}/4.`;
        }
        if (d.key === "stress" && checkIn) {
          const count = Object.values(checkIn.stressIndicators ?? {}).filter(Boolean).length;
          detail = `Stress indicators selected: ${count}.`;
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

/**
 * Very small, transparent “pattern mining” for the Insights screen.
 * This is intentionally simple (summary stats), suitable for a prototype.
 */
export function buildPatterns(days: DailyRecord[]) {
  const usable = days.filter((d) => typeof d.lbi === "number") as Array<DailyRecord & { lbi: number }>;

  if (usable.length < 5) {
    return [
      {
        title: "Not enough history yet",
        detail: "Log a few more days (wearables + check-ins) to unlock pattern insights.",
      },
    ];
  }

  const items: { title: string; detail: string }[] = [];

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  // Mood vs LBI
  const byMood: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const d of usable) {
    const m = d.checkIn?.mood;
    if (m) byMood[m].push(d.lbi);
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
      const map: Record<number, string> = { 1: "😖", 2: "😐", 3: "🙂", 4: "😄" };
      items.push({
        title: "Mood is linked with your LBI",
        detail: `On mood ${map[high.mood]} days your average LBI was ${high.mean} (n=${high.n}). On mood ${map[low.mood]} days it was ${low.mean} (n=${low.n}). Difference: ${diff > 0 ? "+" : ""}${diff}.`,
      });
    }
  }

  // Sleep vs LBI (split by median)
  const withSleep = usable.filter((d) => typeof d.wearable?.sleepHours === "number");
  if (withSleep.length >= 6) {
    const sleeps = withSleep.map((d) => d.wearable!.sleepHours).sort((a, b) => a - b);
    const median = sleeps[Math.floor(sleeps.length / 2)];
    const low = withSleep.filter((d) => d.wearable!.sleepHours <= median).map((d) => d.lbi);
    const high = withSleep.filter((d) => d.wearable!.sleepHours > median).map((d) => d.lbi);
    if (low.length >= 2 && high.length >= 2) {
      const diff = Math.round(avg(high) - avg(low));
      items.push({
        title: "More sleep tends to align with higher scores",
        detail: `When sleep was above your median (${formatHours(median)}), average LBI was ${Math.round(avg(high))}. When it was at/below median, it was ${Math.round(avg(low))}. Difference: ${diff > 0 ? "+" : ""}${diff}.`,
      });
    }
  }

  // Recovery vs LBI (split by median)
  const withRec = usable.filter((d) => typeof d.wearable?.recovery === "number");
  if (withRec.length >= 6) {
    const recs = withRec.map((d) => d.wearable!.recovery).sort((a, b) => a - b);
    const median = recs[Math.floor(recs.length / 2)];
    const low = withRec.filter((d) => d.wearable!.recovery <= median).map((d) => d.lbi);
    const high = withRec.filter((d) => d.wearable!.recovery > median).map((d) => d.lbi);
    if (low.length >= 2 && high.length >= 2) {
      const diff = Math.round(avg(high) - avg(low));
      items.push({
        title: "Recovery is associated with your LBI",
        detail: `When recovery was above your median (${Math.round(median)}), average LBI was ${Math.round(avg(high))}. When it was at/below median, it was ${Math.round(avg(low))}. Difference: ${diff > 0 ? "+" : ""}${diff}.`,
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
      const diff = Math.round(avg(lo) - avg(hi));
      items.push({
        title: "Stress indicators matter",
        detail: `On low-stress days (0–1 indicators) average LBI was ${Math.round(avg(lo))}. On high-stress days (3+ indicators) it was ${Math.round(avg(hi))}. Difference: ${diff > 0 ? "+" : ""}${diff}.`,
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
