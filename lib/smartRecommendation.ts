// smartRecommendation.ts — the "smart nudge" system (Layer 4).
// This is where everything comes together: WHOOP data, check-in mood,
// schedule, upcoming events, and LBI score all feed into one recommendation.
// I chose a remote-first approach with a local fallback so it still works
// offline — the local logic covers the most common patterns.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateExplanation } from "./llm";
import type { DailyCheckIn, FutureEvent, WearableMetrics, ISODate } from "./types";
import type { RecurringItem } from "./schedule";

export type SmartRecommendation = {
  headline: string;       // short bold line, e.g. "Low recovery + big day tomorrow"
  text: string;           // 1-3 sentence actionable advice
  source: "remote" | "local";
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
  /** ML-predicted risk probabilities (if model is trained) */
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

  // Include ML risk predictions when available
  if (input.mlRisk?.lbiRiskProb != null || input.mlRisk?.recoveryRiskProb != null) {
    const riskParts: string[] = [];
    if (input.mlRisk.lbiRiskProb != null) {
      riskParts.push(`balance dip ${Math.round(input.mlRisk.lbiRiskProb * 100)}%`);
    }
    if (input.mlRisk.recoveryRiskProb != null) {
      riskParts.push(`recovery dip ${Math.round(input.mlRisk.recoveryRiskProb * 100)}%`);
    }
    parts.push(`ML-predicted tomorrow risk: ${riskParts.join(", ")}`);
    if (input.mlRisk.topDrivers.length > 0) {
      const drivers = input.mlRisk.topDrivers.map((d) => `${d.name} (${d.direction})`).join(", ");
      parts.push(`Top risk drivers: ${drivers}`);
    }
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

function localRecommendation(input: SmartRecInput): SmartRecommendation {
  const w = input.wearable;
  const baseDate = Date.parse(input.date);
  const tomorrow = input.upcomingEvents.find((e) => {
    const parsed = Date.parse(e.dateISO);
    if (Number.isNaN(parsed) || Number.isNaN(baseDate)) return false;
    const daysAway = Math.ceil((parsed - baseDate) / 86400000);
    return daysAway === 1;
  });
  const todayEvents = input.upcomingEvents.filter((e) => e.dateISO === input.date);
  const hasDemandSchedule = input.schedule.some((s) => s.kind === "demand");
  const isAthlete = input.lifeContexts.some((c) => c.toLowerCase().includes("athlete"));
  const isParent = input.lifeContexts.some((c) => c.toLowerCase().includes("parent") || c.toLowerCase().includes("carer"));

  let headline = "Your day at a glance";
  let text = "Check in when you can — even a quick one helps track your patterns.";

  if (w) {
    const rec = finite(w.recovery);
    const sleep = finite(w.sleepHours);
    const strain = finite(w.strain);
    const lowRecovery = rec != null && rec < 40;
    const highStrain = strain != null && strain >= 15;
    const goodRecovery = rec != null && rec >= 70;
    const goodSleep = sleep != null && sleep >= 7;
    const recStr = rec != null ? `${Math.round(rec)}%` : "unknown";
    const sleepStr = sleep != null ? `${sleep.toFixed(1)}h` : "unknown";
    const strainStr = strain != null ? strain.toFixed(1) : "unknown";

    if (lowRecovery && tomorrow && tomorrow.impactLevel === "high") {
      headline = "Protect tonight for tomorrow";
      text = `Recovery is ${recStr} and ${tomorrow.title} is tomorrow. Prioritise sleep tonight — wind down early, skip screens after 9pm, and push anything non-essential.`;
    } else if (lowRecovery && hasDemandSchedule) {
      headline = "Easy does it today";
      text = `Recovery is only ${recStr} with a demanding schedule ahead. Pace yourself — take breaks between tasks, eat well, and aim for an early night.`;
    } else if (lowRecovery) {
      headline = "Recovery day";
      text = `Your body's at ${recStr} — take it easy. Light movement, good food, and an early wind-down will set you up better for tomorrow.`;
    } else if (highStrain && isAthlete) {
      headline = "High training load";
      text = `Strain hit ${strainStr} — solid effort. Focus on refuelling and sleep tonight. ${goodRecovery ? "Your recovery supports this, but don't stack another heavy session tomorrow." : "Recovery is moderate, so consider active rest tomorrow."}`;
    } else if (highStrain) {
      headline = "Big effort today";
      text = `Your body worked hard (strain ${strainStr}). Match it with proper recovery — hydrate, eat well, and protect your sleep tonight.`;
    } else if (goodRecovery && goodSleep && todayEvents.length === 0) {
      headline = "Good energy, open day";
      text = `Recovery ${recStr} and ${sleepStr} sleep — you're in a strong spot. Great day to tackle something meaningful or push a little harder.`;
    } else if (goodRecovery && goodSleep && tomorrow) {
      headline = "Well-rested and prepared";
      text = `Strong recovery ahead of ${tomorrow.title}. You're in a good position — use today to prepare, stay steady, and carry this momentum.`;
    } else if (isParent && lowRecovery) {
      headline = "Recharge around the kids";
      text = `Recovery is low at ${recStr}. Grab micro-rest when you can — even 10 minutes of quiet between activities makes a difference.`;
    } else if (goodRecovery) {
      headline = "Solid foundation today";
      text = `Recovery is at ${recStr} with ${sleepStr} sleep. Your body is ready — make the most of the energy.`;
    } else if (rec != null || sleep != null) {
      headline = "Steady as you go";
      text = `Recovery ${recStr}, sleep ${sleepStr} — middle of the road. Listen to how you feel and adjust your intensity accordingly.`;
    }
  } else if (todayEvents.length > 0) {
    headline = `${todayEvents.length} event${todayEvents.length > 1 ? "s" : ""} today`;
    text = `You have ${todayEvents.map((e) => e.title).join(" and ")} today. Pace your energy and build in buffer time between commitments.`;
  } else if (tomorrow && tomorrow.impactLevel === "high") {
    headline = `Prep for tomorrow`;
    text = `${tomorrow.title} is tomorrow. Use today to prepare and wind down early — you'll feel the difference.`;
  }

  // ML risk overlay: if the model predicts high risk, add a warning layer
  const mlRisk = input.mlRisk;
  if (mlRisk?.lbiRiskProb != null && mlRisk.lbiRiskProb > 0.65) {
    const driver = mlRisk.topDrivers[0];
    const driverHint = driver ? ` Your ${driver.name.replace("_z", "")} pattern is the biggest factor.` : "";
    headline = "Tomorrow looks tough";
    text = `Your personal model flags a ${Math.round(mlRisk.lbiRiskProb * 100)}% chance of a balance dip tomorrow.${driverHint} Prioritise recovery tonight.`;
  } else if (mlRisk?.recoveryRiskProb != null && mlRisk.recoveryRiskProb > 0.7 && w) {
    headline = "Recovery risk ahead";
    text = `The model predicts ${Math.round(mlRisk.recoveryRiskProb * 100)}% chance your recovery drops tomorrow. Protect your sleep and ease off intensity.`;
  }

  return {
    headline,
    text,
    source: "local",
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

  // Try the LLM first — gives more personalised advice
  const context = buildPrompt(input);
  const remote = await generateExplanation(SYSTEM_PROMPT, context);
  if (remote) {
    const parsed = parseResponse(remote);
    if (parsed) {
      const rec: SmartRecommendation = {
        ...parsed,
        source: "remote",
        generatedAt: new Date().toISOString(),
      };
      await cacheRecommendation(input.date, rec);
      return rec;
    }
  }

  // LLM unavailable/failed — fall back to the rule-based version
  const local = localRecommendation(input);
  await cacheRecommendation(input.date, local);
  return local;
}

// Clear the cached rec — call this after new data comes in so we regenerate.
export async function invalidateRecommendation(date: string): Promise<void> {
  await AsyncStorage.removeItem(cacheKey(date));
}
