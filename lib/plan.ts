// lib/plan.ts
import type { DailyCheckIn, WearableMetrics } from "./types";

export type PlanCategory = "RECOVERY" | "NORMAL";

export type GeneratedPlan = {
  category: PlanCategory;
  focus: string;
  actions: string[];
  triggers: string[];
  explanation: string;
};

function stressCount(checkIn: DailyCheckIn | null) {
  if (!checkIn) return 0;
  return Object.values(checkIn.stressIndicators).filter(Boolean).length;
}

export function generatePlan(input: {
  lbi: number;
  baseline: number | null;
  classification: "balanced" | "overloaded" | "under-recovered";
  confidence: "high" | "medium" | "low";
  wearable: WearableMetrics;
  checkIn: DailyCheckIn | null;
}): GeneratedPlan {

const { lbi, baseline, classification, wearable, checkIn, confidence } = input;

  const sc = stressCount(checkIn);
  const lowSleep = wearable.sleepHours < 6.5;
  const lowRecovery = wearable.recovery < 45;
  const highStrain = (wearable.strain ?? 0) >= 15;
  const deltaFromBaseline = baseline == null ? null : lbi - baseline;
const belowBaseline = deltaFromBaseline != null && deltaFromBaseline <= -10;
const aboveBaseline = deltaFromBaseline != null && deltaFromBaseline >= 10;


  // Base: deterministic categories
 const category: PlanCategory =
  classification === "under-recovered" || lbi <= 45 || belowBaseline ? "RECOVERY" : "NORMAL";

  // Focus line (one sentence)
  const focus =
    category === "RECOVERY"
      ? "Reduce load and prioritise recovery to stabilise energy and mood."
      : "Maintain momentum with structured work blocks and movement.";

  // Actions: tight list, practical
  const actions: string[] = [];
  const triggers: string[] = [];
  const why: string[] = [];

  if (category === "RECOVERY") {
    actions.push("10–20 min easy walk (zone 1/2) + sunlight early");
    actions.push("Protein-forward meals + 2L water (aim steady, not perfect)");
    actions.push("One recovery block: stretch/foam roll 10 min OR hot shower wind-down");
    actions.push("Cap caffeine by 2pm; no late stimulants");
    actions.push("Early night: target +45–90 min vs usual bedtime");

    if (lowSleep) why.push("Sleep hours are low.");
    if (lowRecovery) why.push("Recovery is low.");
    if (highStrain) why.push("Strain is high relative to recovery.");
    if (sc >= 3) why.push("Multiple stress indicators were selected.");
    if (belowBaseline) why.push(`LBI is below your baseline by ${Math.abs(deltaFromBaseline!)}.`);

  } else {
    actions.push("Pick 1 priority task and complete a 45–60 min deep work block");
    actions.push("Movement snack: 2 x 8 min walk breaks or 20 min incline walk");
    actions.push("Keep meals consistent; avoid long gaps (stabilises energy)");
    actions.push("End-of-day reset: 10 min tidy + plan tomorrow’s top 1");
    actions.push("Optional: light social connection (message/call 1 person)");

    if (aboveBaseline) why.push(`LBI is above your baseline by ${deltaFromBaseline!}.`);
    if (aboveBaseline) actions.push("Add one extra hard thing: 20 min focused sprint or slightly harder training");

    if (sc >= 3) {
      actions.push("Add a 5-min breathing reset between tasks (box breathing 4-4-4-4)");
      why.push("Stress indicators suggest mental load is high.");
    }
  }

  // Triggers: “if X then Y”
  triggers.push("If you feel wired/anxious → 90 seconds slow exhale breathing");
  triggers.push("If you procrastinate 10+ mins → start with a 5-min timer");
  triggers.push("If afternoon crash hits → water + 10-min walk before caffeine");

  // Confidence note
  if (confidence === "low") {
    triggers.unshift("Low confidence today: complete check-in to improve accuracy");
  }

  // Guardrails: reduce cognitive load (one focus, max 2 actions, concise triggers)
  const limitedActions = actions.slice(0, 2);
  const limitedTriggers = triggers.slice(0, 3);

  const explanation =
    why.length > 0
      ? `Plan logic: ${why.join(" ")}${deltaFromBaseline == null ? "" : ` (Δ vs baseline: ${deltaFromBaseline >= 0 ? "+" : ""}${deltaFromBaseline})`}${confidence === "low" ? " Confidence is low due to missing signals." : ""}`
      : `Plan logic: your signals are stable enough to maintain a normal day structure.${confidence === "low" ? " Confidence is low due to missing signals." : ""}`;

  return { category, focus, actions: limitedActions, triggers: limitedTriggers, explanation };
}
