// lib/patternInterrupt.ts
//
// Detects negative spirals (3+ consecutive declining days) and
// proactively suggests pattern-breaking actions.
//
// Based on behavioural activation principles (Jacobson et al., 2001):
// when mood declines, activity typically withdraws, which further
// lowers mood. The interrupt breaks this cycle by surfacing specific,
// achievable actions the user can take RIGHT NOW.
//
// Interconnections:
//   - Uses check-in valence + LBI trends to detect decline
//   - Suggests actions from: habits, reframing, grounding, breathwork
//   - Surfaces on home screen as an urgent card
//   - Weekly reflection references interrupted patterns as "wins"

import type { DailyRecord, ISODate } from "./types";
import { getHabits } from "./habits";

export type PatternAlert = {
  active: boolean;
  severity: "mild" | "moderate" | "significant"; // 3, 4, 5+ days
  daysDecline: number;
  message: string;
  suggestedActions: SuggestedAction[];
  detectedAt: string; // ISO
};

export type SuggestedAction = {
  id: string;
  tool: "breathe" | "reframe" | "habit" | "grounding" | "social" | "movement" | "sleep";
  label: string;
  description: string;
  route?: string; // navigation target
};

/**
 * Detect a declining pattern in the most recent records.
 * Looks at valence AND LBI for a complete picture.
 */
export function detectDecline(records: DailyRecord[]): PatternAlert {
  // Sort most recent first
  const sorted = [...records]
    .filter((r) => r.checkIn?.valence != null || r.lbi != null)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length < 3) {
    return { active: false, severity: "mild", daysDecline: 0, message: "", suggestedActions: [], detectedAt: "" };
  }

  // Count consecutive declining days (each day lower than the one before)
  let declineCount = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i].checkIn?.valence ?? (sorted[i].lbi ? (sorted[i].lbi! - 50) / 50 : null);
    const previous = sorted[i + 1].checkIn?.valence ?? (sorted[i + 1].lbi ? (sorted[i + 1].lbi! - 50) / 50 : null);

    if (current == null || previous == null) break;
    if (current < previous - 0.05) {
      declineCount++;
    } else {
      break;
    }
  }

  if (declineCount < 2) {
    return { active: false, severity: "mild", daysDecline: 0, message: "", suggestedActions: [], detectedAt: "" };
  }

  const severity: PatternAlert["severity"] =
    declineCount >= 4 ? "significant" : declineCount >= 3 ? "moderate" : "mild";

  const messages = {
    mild: "Your balance has been dipping for a few days. Small shifts can help.",
    moderate: "A downward pattern is forming. Now is a good time to interrupt it.",
    significant: "You've been declining for several days. Let's break this cycle together.",
  };

  return {
    active: true,
    severity,
    daysDecline: declineCount + 1, // +1 because we count gaps
    message: messages[severity],
    suggestedActions: generateSuggestions(severity),
    detectedAt: new Date().toISOString(),
  };
}

function generateSuggestions(severity: PatternAlert["severity"]): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  // Always suggest grounding (lowest barrier)
  actions.push({
    id: "grounding",
    tool: "grounding",
    label: "30-second grounding",
    description: "A quick body scan to reconnect with the present moment",
    route: "/checkin/grounding",
  });

  // Breathing
  actions.push({
    id: "breathe",
    tool: "breathe",
    label: "Breathing reset",
    description: "A few slow breaths to shift your nervous system state",
  });

  // Reframing (if moderate+)
  if (severity !== "mild") {
    actions.push({
      id: "reframe",
      tool: "reframe",
      label: "Challenge a thought",
      description: "Examine a recurring negative thought with fresh eyes",
      route: "/checkin/reframe",
    });
  }

  // Movement (always good for breaking spirals)
  actions.push({
    id: "movement",
    tool: "movement",
    label: "Move for 5 minutes",
    description: "Any movement — walk, stretch, dance. Motion changes emotion.",
  });

  // Social connection
  actions.push({
    id: "social",
    tool: "social",
    label: "Reach out to someone",
    description: "Text a friend, call a family member. Connection is protective.",
  });

  // Sleep (if significant)
  if (severity === "significant") {
    actions.push({
      id: "sleep",
      tool: "sleep",
      label: "Prioritise tonight's sleep",
      description: "Complete your sleep hygiene checklist — recovery starts here",
      route: "/checkin/sleep-hygiene",
    });
  }

  return actions;
}

/**
 * Quick check — are we in a decline? (For home screen badge)
 */
export function isInDecline(records: DailyRecord[]): boolean {
  return detectDecline(records).active;
}

/**
 * Get a single headline action for the decline card.
 */
export function topAction(alert: PatternAlert): SuggestedAction | null {
  return alert.suggestedActions[0] ?? null;
}
