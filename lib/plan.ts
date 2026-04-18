// lib/plan.ts
import type { DailyCheckIn, WearableMetrics } from "./types";

export type PlanCategory = "RECOVERY" | "NORMAL";

export type GeneratedPlan = {
  category: PlanCategory;
  focus: string;
  actions: string[];
  actionReasons: string[];
  triggers: string[];
  explanation: string;
};

function stressCount(checkIn: DailyCheckIn | null) {
  if (!checkIn) return 0;
  if (checkIn.stressIndicators) {
    return Object.values(checkIn.stressIndicators).filter(Boolean).length;
  }
  if (typeof checkIn.stressLevel === "number") {
    return checkIn.stressLevel - 1;
  }
  return 0;
}

/** Map a user value to a concrete, actionable suggestion */
function valueAction(value: string, category: PlanCategory): { action: string; reason: string } | null {
  const v = value.toLowerCase();
  if (category === "RECOVERY") {
    if (v === "connection") return { action: "Reach out to one person you care about — a short message counts", reason: "Connection supports recovery without adding physical load." };
    if (v === "peace") return { action: "Take 10 minutes of quiet time — no screens, just breathing", reason: "Stillness aligns with your value of peace and supports recovery." };
    if (v === "gratitude") return { action: "Write down one thing you're grateful for today", reason: "Gratitude reflection can shift perspective on difficult recovery days." };
    if (v === "health") return { action: "Prepare one nourishing meal mindfully today", reason: "Intentional nutrition connects your health value to recovery." };
    if (v === "growth") return { action: "Read or listen to something inspiring for 15 minutes", reason: "Low-effort learning honours your growth value without draining energy." };
    if (v === "creativity") return { action: "Sketch, doodle, or write freely for 10 minutes", reason: "Creative expression can be restorative on recovery days." };
    if (v === "kindness") return { action: "Do one small act of kindness — for yourself or someone else", reason: "Kindness actions support emotional recovery." };
    if (v === "courage") return { action: "Acknowledge one thing that was hard today — that takes courage", reason: "Self-honesty on tough days aligns with your courage value." };
    if (v === "resilience") return { action: "Remind yourself: rest is part of resilience, not a break from it", reason: "Recovery days build the resilience you value." };
    if (v === "discipline") return { action: "Stick to your sleep routine tonight — discipline includes rest", reason: "Disciplined recovery is just as valuable as disciplined work." };
    if (v === "purpose") return { action: "Reflect for 5 minutes on what gives your days meaning", reason: "Purpose reflection grounds recovery days." };
    if (v === "joy") return { action: "Do one thing purely for enjoyment today — no productivity required", reason: "Joy is part of recovery and aligns with what you value." };
  } else {
    if (v === "connection") return { action: "Have a real conversation with someone today — not just messages", reason: "Meaningful connection reinforces your value when energy allows it." };
    if (v === "peace") return { action: "Build in a 10-minute buffer between tasks — protect your calm", reason: "Transitions support the inner peace you value." };
    if (v === "gratitude") return { action: "Share one specific thank you with someone today", reason: "Expressing gratitude strengthens relationships and your own wellbeing." };
    if (v === "health") return { action: "Move your body in a way that feels good for 20+ minutes", reason: "Active health choices match your energy today." };
    if (v === "growth") return { action: "Learn one new thing or push slightly outside your comfort zone", reason: "Normal-energy days are ideal for growth-oriented challenges." };
    if (v === "creativity") return { action: "Make time for a creative project or try a new approach to something", reason: "Stable energy supports creative exploration." };
    if (v === "kindness") return { action: "Go out of your way for someone today — even something small", reason: "Kindness thrives when you have energy to give." };
    if (v === "courage") return { action: "Do one thing today that slightly scares you", reason: "Courage grows through small, regular acts." };
    if (v === "resilience") return { action: "If something goes wrong today, practise responding calmly", reason: "Resilience is built in ordinary moments, not just crises." };
    if (v === "discipline") return { action: "Complete your most important task before checking your phone", reason: "Discipline in small moments compounds over time." };
    if (v === "purpose") return { action: "Align your biggest task today with your longer-term goals", reason: "Purpose-driven work is more sustainable and fulfilling." };
    if (v === "joy") return { action: "Schedule something fun today — you've earned it", reason: "Joy isn't a reward; it's fuel." };
  }
  return null;
}

/** Map a user's stated goal to a concrete action */
function goalAction(goal: string, category: PlanCategory): { action: string; reason: string } | null {
  const g = goal.toLowerCase();
  if (category === "RECOVERY") {
    if (g.includes("sleep")) return { action: "Set your bedroom up for a great night — dark, cool, screens away by 9pm", reason: "Sleep quality is your stated goal, and recovery days are the best time to invest in it." };
    if (g.includes("stress")) return { action: "Try a 5-minute body scan before bed tonight", reason: "Stress recovery is your goal — gentle wind-down techniques help the most on low days." };
    if (g.includes("energy")) return { action: "Keep meals regular today — no skipping, even if appetite is low", reason: "Consistent energy starts with consistent fuel, especially on recovery days." };
    if (g.includes("emotional")) return { action: "Name one emotion you felt strongly today — just notice it", reason: "Emotional awareness grows by practising it on quieter days too." };
    if (g.includes("physical") || g.includes("activity")) return { action: "Gentle stretching or a short walk — nothing more", reason: "Your physical activity goal is best served by active recovery today." };
    if (g.includes("eating") || g.includes("mindful")) return { action: "Eat one meal slowly today — no screen, just the food", reason: "Recovery days are perfect for practising mindful eating." };
  } else {
    if (g.includes("sleep")) return { action: "Start your wind-down routine 30 minutes earlier tonight", reason: "Protecting sleep on good days builds the habit your goal depends on." };
    if (g.includes("stress")) return { action: "Take 3 slow breaths between tasks today — reset before the next thing", reason: "Small stress-recovery moments throughout the day compound over time." };
    if (g.includes("energy")) return { action: "Take a 10-minute walk after lunch to sustain your afternoon energy", reason: "A midday movement break is one of the best energy regulators." };
    if (g.includes("emotional")) return { action: "Check in with yourself at midday — how are you actually feeling?", reason: "Building emotional awareness means checking in when things are fine, not just when they're not." };
    if (g.includes("physical") || g.includes("activity")) return { action: "Get at least 20 minutes of purposeful movement today", reason: "Your energy supports physical activity — make the most of it." };
    if (g.includes("eating") || g.includes("mindful")) return { action: "Prepare one meal from scratch today — connect with what you're eating", reason: "Mindful eating is easiest to practise when you're not depleted." };
  }
  return null;
}

/** Map life contexts to relevant plan tweaks */
function contextTweak(contexts: string[], category: PlanCategory): { action: string; reason: string } | null {
  if (contexts.includes("Student")) {
    return category === "RECOVERY"
      ? { action: "Review notes lightly instead of heavy study — protect your brain", reason: "Students benefit from spaced, low-load revision on recovery days." }
      : { action: "Use a 25/5 study timer for focused blocks today", reason: "Structured study sessions suit your student routine." };
  }
  if (contexts.includes("Shift worker")) {
    return { action: "Prioritise consistent meal times even if your shift pattern varies", reason: "Shift workers benefit from anchoring routines around meals." };
  }
  if (contexts.includes("Carer / parent")) {
    return { action: "Carve out 15 minutes that are just for you today", reason: "Carers need micro-recovery to sustain the care they give." };
  }
  if (contexts.includes("Athlete")) {
    return category === "RECOVERY"
      ? { action: "Active recovery only — mobility work, no intensity", reason: "Your body needs adaptation time, not more load." }
      : { action: "Train with intent today — quality over volume", reason: "Stable recovery supports purposeful training." };
  }
  return null;
}

export function generatePlan(input: {
  lbi: number;
  baseline: number | null;
  classification: "balanced" | "overloaded" | "under-recovered";
  confidence: "high" | "medium" | "low";
  wearable: WearableMetrics;
  checkIn: DailyCheckIn | null;
  values?: string[];
  lifeContexts?: string[];
  goals?: string[];
}): GeneratedPlan {
  const { lbi, baseline, classification, wearable, checkIn, confidence, values, lifeContexts, goals } = input;

  const sc = stressCount(checkIn);
  const lowSleep = wearable.sleepHours < 6.5;
  const lowRecovery = wearable.recovery < 45;
  const highStrain = (wearable.strain ?? 0) >= 15;
  const deltaFromBaseline = baseline == null ? null : lbi - baseline;
  const belowBaseline = deltaFromBaseline != null && deltaFromBaseline <= -10;
  const aboveBaseline = deltaFromBaseline != null && deltaFromBaseline >= 10;

  const category: PlanCategory =
    classification === "under-recovered" || lbi <= 45 || belowBaseline ? "RECOVERY" : "NORMAL";

  const focus =
    category === "RECOVERY"
      ? "Take it easy today — your body and mind need some recovery time."
      : "You're in a good place. Make the most of today with structured focus and movement.";

  const actions: string[] = [];
  const actionReasons: string[] = [];
  const triggers: string[] = [];
  const why: string[] = [];

  if (category === "RECOVERY") {
    actions.push("Go for a gentle 10–20 minute walk, ideally in the morning");
    actionReasons.push("Light movement helps recovery without adding strain.");
    actions.push("Focus on eating well and staying hydrated today");
    actionReasons.push("Good nutrition supports your body when it's recovering.");
    actions.push("Try to get to bed 45–90 minutes earlier than usual");
    actionReasons.push("Extra sleep is the single best thing for recovery.");

    if (lowSleep) why.push("Your sleep was shorter than ideal.");
    if (lowRecovery) why.push("Your recovery score is low.");
    if (highStrain) why.push("Yesterday's strain was high.");
    if (sc >= 3) why.push("You flagged several stress indicators.");
    if (belowBaseline) why.push(`Your balance is ${Math.abs(deltaFromBaseline!)} points below your personal baseline.`);
  } else {
    actions.push("Pick your most important task and give it a focused 45–60 minute block");
    actionReasons.push("Your energy supports deep work today — use it wisely.");
    actions.push("Get some movement in — a 20 minute walk or light exercise");
    actionReasons.push("Movement keeps your energy steady throughout the day.");
    actions.push("Wind down tonight with a quick plan for tomorrow");
    actionReasons.push("A simple end-of-day review helps build consistency.");

    if (aboveBaseline) {
      why.push(`Your balance is ${deltaFromBaseline!} points above baseline — nice work.`);
    }
    if (sc >= 3) {
      actions.push("Take a few deep breaths between tasks (4 counts in, 4 out)");
      actionReasons.push("Your stress indicators are up — short breathing resets help.");
      why.push("Stress indicators are elevated despite good overall balance.");
    }
  }

  // Wire in user goals — shape actions around what they said matters most
  if (goals?.length) {
    for (const goal of goals) {
      const ga = goalAction(goal, category);
      if (ga) {
        actions.push(ga.action);
        actionReasons.push(ga.reason);
      }
    }
  }

  // Wire in the user's values — rotate through them across days
  if (values?.length) {
    // Use day-of-year to cycle through values so plans feel fresh
    const dayIndex = Math.floor(Date.now() / 86400000) % values.length;
    const va = valueAction(values[dayIndex], category);
    if (va) {
      actions.push(va.action);
      actionReasons.push(va.reason);
    }
  }

  // Wire in all matching life contexts
  if (lifeContexts?.length) {
    const ct = contextTweak(lifeContexts, category);
    if (ct) {
      actions.push(ct.action);
      actionReasons.push(ct.reason);
    }
  }

  // Triggers
  triggers.push("Feeling anxious? → 90 seconds of slow exhale breathing");
  triggers.push("Can't start a task? → Set a 5-minute timer and just begin");
  triggers.push("Afternoon slump? → Water + a short walk before reaching for caffeine");

  if (confidence === "low") {
    triggers.unshift("Data is limited today — complete your check-in to improve accuracy");
  }

  // Cap actions to keep it digestible
  const limitedActions = actions.slice(0, 4);
  const limitedActionReasons = actionReasons.slice(0, 4);
  const limitedTriggers = triggers.slice(0, 3);

  const explanation =
    why.length > 0
      ? `${why.join(" ")}${confidence === "low" ? " Some data was missing, so confidence is lower." : ""}`
      : `Your signals look stable today.${confidence === "low" ? " Some data was missing, so confidence is lower." : ""}`;

  return { category, focus, actions: limitedActions, actionReasons: limitedActionReasons, triggers: limitedTriggers, explanation };
}
