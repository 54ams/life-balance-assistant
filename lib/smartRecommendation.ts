// smartRecommendation.ts — the daily recommendation pipeline.
//
// Hierarchy (Objective 5):
//   1. ML classifier (lib/ml/recommender.ts) selects a recommendation
//      *category* from {RECOVER, MAINTAIN, PUSH}. This is the primary,
//      always-on signal and is what we mean by "ML generates the
//      personalised daily recommendation".
//   2. The category's template is rendered against the current day's
//      observations (recovery, sleep, strain, schedule, upcoming events)
//      to produce a concrete, parameterised headline and action.
//   3. The risk model (predictTomorrowRisk) overlays a clearly flagged
//      warning when it is highly confident about a balance dip — purely
//      additive, never silently overwriting the ML category choice.
//   4. The LLM is offered the same context plus the chosen category; if
//      it returns useable text we use it (richer phrasing); otherwise
//      we keep the template output. The category is fixed by ML in
//      either path so the user-facing recommendation is always ML-led.
//
// Each path records its `source` so the home screen can show provenance
// honestly: "ml", "ml-cold-start", "ml + llm", or "rules" (only used as
// a defensive fallback when no feature vector can be built — e.g. a
// brand-new user with no wearable + no check-in).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateExplanation } from "./llm";
import type { DailyCheckIn, FutureEvent, WearableMetrics, ISODate } from "./types";
import type { RecurringItem } from "./schedule";
import type { RecCategory, RecPrediction } from "./ml/recommender";

export type SmartRecommendation = {
  headline: string;       // short bold line
  text: string;           // 1-3 sentence actionable advice
  /** Where the *category* came from. Text may be enriched by the LLM
   *  but the recommendation choice is the ML category in all "ml" / "ml-cold-start" cases. */
  source: "ml" | "ml-cold-start" | "ml+llm" | "ml-cold-start+llm" | "rules";
  /** ML category that drove the recommendation (null only when source==="rules"). */
  category: RecCategory | null;
  /** Class probabilities, when ML was used. Surfaced for transparency. */
  probs?: Record<RecCategory, number>;
  /** Top 3 features that drove the category choice. */
  topDrivers?: { name: string; direction: "up" | "down"; strength: number }[];
  generatedAt: string;
};

const CACHE_KEY_PREFIX = "life_balance_smart_rec_";

function cacheKey(date: string): string {
  return `${CACHE_KEY_PREFIX}${date}`;
}

export async function getCachedRecommendation(date: string): Promise<SmartRecommendation | null> {
  const raw = await AsyncStorage.getItem(cacheKey(date));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SmartRecommendation;
  } catch {
    return null;
  }
}

async function cacheRecommendation(date: string, rec: SmartRecommendation): Promise<void> {
  await AsyncStorage.setItem(cacheKey(date), JSON.stringify(rec));
}

export type SmartRecInput = {
  date: ISODate;
  wearable: WearableMetrics | null;
  checkIn: DailyCheckIn | null;
  lbi: number | null;
  lifeContexts: string[];
  schedule: RecurringItem[];
  upcomingEvents: FutureEvent[];
  values: string[];
  /** Primary ML signal: category classifier output. When present, drives
   *  the recommendation. */
  mlCategory?: RecPrediction | null;
  /** Secondary ML signal: next-day risk probabilities. Used as a high-
   *  confidence overlay on top of the category-selected recommendation. */
  mlRisk?: {
    lbiRiskProb: number | null;
    recoveryRiskProb: number | null;
    topDrivers: { name: string; direction: "up" | "down"; strength: number }[];
  } | null;
};

// Safe accessors — WHOOP can return partial days (e.g. recovery posted
// before sleep is scored). Any field can be null/undefined even if the
// outer `wearable` object is present.
function finite(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function buildPrompt(input: SmartRecInput): string {
  const parts: string[] = [];

  if (input.wearable) {
    const rec = finite(input.wearable.recovery);
    const sleep = finite(input.wearable.sleepHours);
    const strain = finite(input.wearable.strain);
    const fields: string[] = [];
    if (rec != null) fields.push(`recovery ${Math.round(rec)}%`);
    if (sleep != null) fields.push(`sleep ${sleep.toFixed(1)}h`);
    if (strain != null) fields.push(`strain ${strain.toFixed(1)}`);
    if (fields.length) parts.push(`WHOOP data: ${fields.join(", ")}`);
  }

  if (input.lbi != null) {
    parts.push(`Life Balance Index: ${Math.round(input.lbi)}/100`);
  }

  if (input.checkIn) {
    const mood = input.checkIn.mood;
    const stress = input.checkIn.stressLevel;
    parts.push(`Self-reported: mood ${mood}/5, stress ${stress}/5`);
    if (input.checkIn.lifeContext?.length) {
      const tags = input.checkIn.lifeContext.map((t) => `${t.id} (${t.kind})`).join(", ");
      parts.push(`Active life factors: ${tags}`);
    }
  }

  if (input.schedule.length > 0) {
    parts.push(`Today's schedule: ${input.schedule.map((s) => `${s.label} (${s.kind})`).join(", ")}`);
  }

  if (input.upcomingEvents.length > 0) {
    const baseDate = Date.parse(input.date);
    const evts = input.upcomingEvents
      .map((e) => {
        const parsed = Date.parse(e.dateISO);
        if (Number.isNaN(parsed) || Number.isNaN(baseDate)) return null;
        const daysAway = Math.ceil((parsed - baseDate) / 86400000);
        const when = daysAway === 0 ? "today" : daysAway === 1 ? "tomorrow" : `in ${daysAway} days`;
        return `${e.title} (${when}, ${e.impactLevel} impact)`;
      })
      .filter((s): s is string => s !== null);
    if (evts.length) parts.push(`Upcoming: ${evts.join("; ")}`);
  }

  if (input.values.length > 0) {
    parts.push(`User values: ${input.values.join(", ")}`);
  }

  if (input.lifeContexts.length > 0) {
    parts.push(`Life roles: ${input.lifeContexts.join(", ")}`);
  }

  // Primary ML signal: the chosen recommendation category and its drivers.
  if (input.mlCategory) {
    const probs = input.mlCategory.probs;
    parts.push(
      `ML-chosen category: ${input.mlCategory.category} ` +
        `(probs: RECOVER ${probs.RECOVER.toFixed(2)}, ` +
        `MAINTAIN ${probs.MAINTAIN.toFixed(2)}, ` +
        `PUSH ${probs.PUSH.toFixed(2)}; ` +
        `provenance: ${input.mlCategory.provenance})`,
    );
    if (input.mlCategory.topDrivers.length > 0) {
      const drivers = input.mlCategory.topDrivers
        .map((d) => `${d.name} (${d.direction})`)
        .join(", ");
      parts.push(`Top drivers of the category choice: ${drivers}`);
    }
  }

  // Secondary ML signal: tomorrow risk overlay
  if (input.mlRisk?.lbiRiskProb != null || input.mlRisk?.recoveryRiskProb != null) {
    const riskParts: string[] = [];
    if (input.mlRisk.lbiRiskProb != null) {
      riskParts.push(`balance dip ${Math.round(input.mlRisk.lbiRiskProb * 100)}%`);
    }
    if (input.mlRisk.recoveryRiskProb != null) {
      riskParts.push(`recovery dip ${Math.round(input.mlRisk.recoveryRiskProb * 100)}%`);
    }
    parts.push(`ML-predicted tomorrow risk: ${riskParts.join(", ")}`);
  }

  return parts.join("\n");
}

const SYSTEM_PROMPT = `You are a wellbeing advisor for a life balance app. Given the user's physiological data, emotional state, life context, schedule, and upcoming events, provide:
1. A short headline (max 8 words) summarising the key insight
2. One specific, actionable recommendation in 1-2 sentences

Be concrete: mention specific times, activities, and reasons. Reference their actual data.
If recovery is low and they have a big event coming, tell them exactly what to prioritise.
If they're well-rested with a light day, encourage them to make the most of it.
If they're training for something, factor that in.

Tone: warm, direct, practical. No medical advice. No generic platitudes.
Format your response as:
HEADLINE: [headline]
ADVICE: [advice]`;

// -----------------------------------------------------------------
// Category → headline/action templates.
// -----------------------------------------------------------------
// The ML model picks the category. The template fills in concrete
// observations from today's data so the recommendation is grounded in
// what actually happened, while the *choice* of category is ML-driven.
// Templates are deliberately short and parameterised — no hidden
// branching that would shift the burden of the decision back into rules.
function renderCategoryTemplate(
  category: RecCategory,
  input: SmartRecInput,
): { headline: string; text: string } {
  const w = input.wearable;
  const rec = w ? finite(w.recovery) : null;
  const sleep = w ? finite(w.sleepHours) : null;
  const strain = w ? finite(w.strain) : null;
  const recStr = rec != null ? `${Math.round(rec)}%` : "unknown";
  const sleepStr = sleep != null ? `${sleep.toFixed(1)}h` : null;
  const strainStr = strain != null ? strain.toFixed(1) : null;

  const baseDate = Date.parse(input.date);
  const tomorrowEvent = input.upcomingEvents.find((e) => {
    const parsed = Date.parse(e.dateISO);
    if (Number.isNaN(parsed) || Number.isNaN(baseDate)) return false;
    return Math.ceil((parsed - baseDate) / 86400000) === 1;
  });
  const todayEvents = input.upcomingEvents.filter((e) => e.dateISO === input.date);
  const hasDemandSchedule = input.schedule.some((s) => s.kind === "demand");

  switch (category) {
    case "RECOVER": {
      if (tomorrowEvent && tomorrowEvent.impactLevel === "high") {
        return {
          headline: "Protect tonight for tomorrow",
          text: `Your patterns suggest you should ease off — ${tomorrowEvent.title} is tomorrow${rec != null ? ` and recovery is ${recStr}` : ""}. Wind down early, skip screens after 9pm, and push anything non-essential.`,
        };
      }
      if (hasDemandSchedule) {
        return {
          headline: "Easy does it today",
          text: `The model flags this as a recovery day${rec != null ? ` (recovery ${recStr})` : ""}. With a demanding schedule ahead, pace yourself — take breaks, eat well, aim for an early night.`,
        };
      }
      return {
        headline: "Recovery day",
        text: `Your signals point to recovery${rec != null ? ` — recovery ${recStr}${sleepStr ? `, sleep ${sleepStr}` : ""}` : ""}. Light movement, good food, and an early wind-down will set you up for tomorrow.`,
      };
    }
    case "PUSH": {
      if (tomorrowEvent) {
        return {
          headline: "Strong day, prepare for tomorrow",
          text: `Your patterns support a high-output day${rec != null ? ` (recovery ${recStr}${sleepStr ? `, sleep ${sleepStr}` : ""})` : ""}. Use the energy on what matters most, then carry it into ${tomorrowEvent.title} tomorrow.`,
        };
      }
      if (todayEvents.length > 0) {
        return {
          headline: "Make it count today",
          text: `Your signals say you can push${rec != null ? ` — recovery ${recStr}` : ""}. With ${todayEvents.map((e) => e.title).join(" and ")} on the day, focus your energy where it matters and protect tonight's wind-down.`,
        };
      }
      return {
        headline: "Good energy, open day",
        text: `The model picks this as a push day${rec != null ? ` (recovery ${recStr}${sleepStr ? `, sleep ${sleepStr}` : ""})` : ""}. Tackle something meaningful or build a habit while the conditions are with you.`,
      };
    }
    case "MAINTAIN":
    default: {
      if (hasDemandSchedule) {
        return {
          headline: "Steady through a busy day",
          text: `Your patterns are around your personal baseline${rec != null ? ` (recovery ${recStr})` : ""}. Keep the day moving in chunks, take real breaks between demands, and don't stack more onto the evening.`,
        };
      }
      if (strainStr && strain != null && strain >= 15) {
        return {
          headline: "Match yesterday's effort with recovery",
          text: `You held a balanced state${rec != null ? ` (recovery ${recStr})` : ""} but strain hit ${strainStr}. Stay steady today — refuel, hydrate, and protect your sleep.`,
        };
      }
      return {
        headline: "Hold steady",
        text: `Your signals are close to your usual${rec != null ? ` (recovery ${recStr}${sleepStr ? `, sleep ${sleepStr}` : ""})` : ""}. Keep the routine — what you do most days is what shapes the trend.`,
      };
    }
  }
}

function applyRiskOverlay(
  base: { headline: string; text: string },
  mlRisk: SmartRecInput["mlRisk"],
): { headline: string; text: string } {
  if (mlRisk?.lbiRiskProb != null && mlRisk.lbiRiskProb > 0.65) {
    const driver = mlRisk.topDrivers[0];
    const driverHint = driver
      ? ` Your ${driver.name.replace("_z", "")} pattern is the biggest factor.`
      : "";
    return {
      headline: base.headline,
      text: `${base.text} Heads-up: the model also flags a ${Math.round(mlRisk.lbiRiskProb * 100)}% chance of a balance dip tomorrow.${driverHint}`,
    };
  }
  return base;
}

/**
 * Pure-function fallback used only when ML cannot produce a category
 * (no feature row exists yet — i.e. a brand-new user with no wearable
 * and no check-in). Kept tiny on purpose: this is *not* the supported
 * recommendation path. Any real prediction goes through ML.
 */
function rulesOnlyRecommendation(input: SmartRecInput): SmartRecommendation {
  const baseDate = Date.parse(input.date);
  const tomorrow = input.upcomingEvents.find((e) => {
    const parsed = Date.parse(e.dateISO);
    if (Number.isNaN(parsed) || Number.isNaN(baseDate)) return false;
    return Math.ceil((parsed - baseDate) / 86400000) === 1;
  });
  let headline = "Your day at a glance";
  let text = "Complete a check-in and (if you have one) sync your wearable so the model can personalise tomorrow's recommendation.";
  if (tomorrow && tomorrow.impactLevel === "high") {
    headline = "Prep for tomorrow";
    text = `${tomorrow.title} is tomorrow. Use today to prepare and wind down early — once a check-in is in, the model will tailor this further.`;
  }
  return {
    headline,
    text,
    source: "rules",
    category: null,
    generatedAt: new Date().toISOString(),
  };
}

function sourceForProvenance(
  provenance: RecPrediction["provenance"],
): SmartRecommendation["source"] {
  if (provenance === "ml") return "ml";
  if (provenance === "ml-cold-start") return "ml-cold-start";
  return "rules";
}

function llmSourceForProvenance(
  provenance: RecPrediction["provenance"],
): SmartRecommendation["source"] {
  if (provenance === "ml") return "ml+llm";
  if (provenance === "ml-cold-start") return "ml-cold-start+llm";
  // The category was chosen by deterministic rules, but the LLM can still
  // rephrase the user-facing text. We keep the source label honest:
  // "rules" — the LLM never altered the category choice.
  return "rules";
}

function buildFromCategory(input: SmartRecInput, mlCategory: RecPrediction): SmartRecommendation {
  const tpl = renderCategoryTemplate(mlCategory.category, input);
  const overlaid = applyRiskOverlay(tpl, input.mlRisk ?? null);
  return {
    ...overlaid,
    source: sourceForProvenance(mlCategory.provenance),
    category: mlCategory.category,
    probs: mlCategory.probs,
    topDrivers: mlCategory.topDrivers,
    generatedAt: new Date().toISOString(),
  };
}

function parseResponse(raw: string): { headline: string; text: string } | null {
  const headlineMatch = raw.match(/HEADLINE:\s*(.+)/i);
  const adviceMatch = raw.match(/ADVICE:\s*(.+)/is);
  if (headlineMatch && adviceMatch) {
    return {
      headline: headlineMatch[1].trim(),
      text: adviceMatch[1].trim(),
    };
  }
  // If the LLM didn't follow the format, just use whatever it gave us
  if (raw.trim().length > 10) {
    const lines = raw.trim().split("\n").filter((l) => l.trim());
    return {
      headline: lines[0].slice(0, 50),
      text: lines.slice(1).join(" ").trim() || lines[0],
    };
  }
  return null;
}

export async function generateSmartRecommendation(input: SmartRecInput): Promise<SmartRecommendation> {
  // Return cached rec if we already generated one today (avoids repeat LLM calls)
  const cached = await getCachedRecommendation(input.date);
  if (cached) return cached;

  // Spine of the pipeline: the ML classifier picks the category. Without
  // a category we cannot honestly say "ML generated the recommendation",
  // so we only use the LLM/templates *after* the category has been set.
  const mlCategory = input.mlCategory ?? null;
  if (!mlCategory) {
    const fallback = rulesOnlyRecommendation(input);
    await cacheRecommendation(input.date, fallback);
    return fallback;
  }

  const base = buildFromCategory(input, mlCategory);

  // Optional richer phrasing: ask the LLM to rewrite, but constrain it
  // to the ML-selected category so the recommendation choice stays
  // ML-led. If the LLM is unavailable or off-format we keep the
  // template output untouched — both paths show the same category.
  const context = buildPrompt(input);
  const constrainedSystem = `${SYSTEM_PROMPT}\n\nIMPORTANT: The recommendation category has already been chosen by the user's personal model and is "${mlCategory.category}" (RECOVER = ease off, MAINTAIN = hold steady, PUSH = make the most of energy). Phrase your headline and advice so they clearly fit this category. Do not flip the recommendation to a different category.`;
  const remote = await generateExplanation(constrainedSystem, context);
  if (remote) {
    const parsed = parseResponse(remote);
    if (parsed) {
      const enriched: SmartRecommendation = {
        ...base,
        headline: parsed.headline,
        text: parsed.text,
        source: llmSourceForProvenance(mlCategory.provenance),
      };
      await cacheRecommendation(input.date, enriched);
      return enriched;
    }
  }

  await cacheRecommendation(input.date, base);
  return base;
}

// Clear the cached rec — call this after new data comes in so we regenerate.
export async function invalidateRecommendation(date: string): Promise<void> {
  await AsyncStorage.removeItem(cacheKey(date));
}
