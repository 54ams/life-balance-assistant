// lib/triangulation.ts
//
// Triangulation / agreement score across the four capture modalities.
//
// Rationale: methodological triangulation (Denzin 1978) argues that
// findings are more credible when multiple measurement sources
// converge. Applied to a single day's wellbeing signal, it lets the
// app say *how confident* the score is — not just what the score is —
// which is the Doshi-Velez & Kim (2017) call for uncertainty-aware
// explanations in user-facing AI.
//
// Modalities considered:
//   1. Canvas  — self-report affect (valence; used as a mental signal)
//   2. Tags    — life-context demand pressure (inverted to mental)
//   3. Note    — sentiment from the on-device keyword matcher
//   4. Wearable — recovery, as a physiological signal
//
// Normalisation: every modality is mapped to a signed scalar in
// [-1, 1] where +1 is "unambiguously good" and -1 is "unambiguously
// hard". The agreement score is then 1 - range(values) / 2, bounded
// to [0, 1]. Range is a robust, explainable proxy for disagreement
// (vs. standard deviation, which is harder to defend in a viva).

import type { DailyRecord } from "./types";
import { demandPressure } from "./lifeContext";
import { localSentiment } from "./noteInterpret";

export type AgreementInput = {
  /** -1..1 from Russell circumplex valence. Optional. */
  canvasValence?: number | null;
  /** -1..1 from Lazarus demand-resource balance. Optional. */
  tagDemandPressure?: number | null; // positive = more demand
  /** -1..1 from note sentiment matcher. Optional. */
  noteSentiment?: number | null;
  /** 0..100 wearable recovery, mapped to -1..1 internally. Optional. */
  recovery?: number | null;
};

export type AgreementResult = {
  /** 0..1 — higher = more agreement across modalities. */
  score: number;
  /** Number of modalities that contributed. */
  modalities: number;
  /** Signed per-modality values in [-1,1], for explanation panels. */
  components: {
    canvas?: number;
    tags?: number;
    note?: number;
    wearable?: number;
  };
  /** Short human-readable label. */
  label: "converging" | "mostly agreeing" | "mixed signals" | "insufficient";
};

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/**
 * Compute the agreement score from already-normalised signals.
 * Pure + easy to test; the DailyRecord helper below calls into this.
 */
export function agreementFromSignals(input: AgreementInput): AgreementResult {
  const components: AgreementResult["components"] = {};
  const values: number[] = [];

  if (typeof input.canvasValence === "number") {
    const v = clamp(input.canvasValence, -1, 1);
    components.canvas = v;
    values.push(v);
  }
  if (typeof input.tagDemandPressure === "number") {
    // Invert: more demand → worse → negative.
    const v = clamp(-input.tagDemandPressure, -1, 1);
    components.tags = v;
    values.push(v);
  }
  if (typeof input.noteSentiment === "number") {
    const v = clamp(input.noteSentiment, -1, 1);
    components.note = v;
    values.push(v);
  }
  if (typeof input.recovery === "number") {
    // Map 0..100 → -1..1 around a 50 midpoint.
    const v = clamp((input.recovery - 50) / 50, -1, 1);
    components.wearable = v;
    values.push(v);
  }

  if (values.length < 2) {
    return {
      score: 0,
      modalities: values.length,
      components,
      label: "insufficient",
    };
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min; // 0..2
  const score = clamp(1 - range / 2, 0, 1);

  const label: AgreementResult["label"] =
    score >= 0.8 ? "converging" : score >= 0.55 ? "mostly agreeing" : "mixed signals";

  return { score, modalities: values.length, components, label };
}

/**
 * Build the triangulation result from a stored DailyRecord.
 * Note: noteSentiment is computed on-the-fly from the saved note.
 * That's intentional — we don't persist a sentiment number that
 * could be stale if the matcher cues change.
 */
export function agreementForDay(r: Pick<DailyRecord, "checkIn" | "emotion" | "wearable">): AgreementResult {
  const ci = r.checkIn ?? null;
  const em = r.emotion ?? null;

  const canvasValence =
    (typeof ci?.valence === "number" && ci.valence) ||
    (typeof em?.valence === "number" && em.valence) ||
    null;

  const tagPressure = ci?.lifeContext?.length ? demandPressure(ci.lifeContext) : null;

  const noteText = (em?.reflection ?? ci?.notes ?? "").trim();
  const noteSent = noteText ? localSentiment(noteText) : null;

  const recovery = r.wearable?.recovery ?? null;

  return agreementFromSignals({
    canvasValence,
    tagDemandPressure: tagPressure,
    noteSentiment: noteSent,
    recovery,
  });
}
