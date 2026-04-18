// lib/lifeContext.ts
//
// Life-context tag taxonomy for the redesigned check-in.
//
// Grounded in Lazarus & Folkman (1984) transactional model of stress:
// wellbeing emerges from the *balance* between demands (stressors) and
// resources (supports), not from either alone. So the taxonomy splits
// tags into:
//
//   - demand   : things currently asking something of the user
//                (exam, money, deadline, family conflict, illness…)
//   - resource : things currently replenishing the user
//                (friends, nature, rest, movement, creative work…)
//
// Downstream code uses the demand/resource balance to derive the
// legacy stress/mood 1–5 fields, to compute a cognitive-load signal
// for the Mind–Body Bridge (H8), and as one of four modalities in
// the triangulation/agreement score.
//
// Tag ids are stable snake_case strings. Labels are UI strings only —
// safe to re-word without a migration. `kind` is fixed at definition
// time (a tag is either a demand or a resource, not both).

export type TagKind = "demand" | "resource";

export type TagDefinition = {
  id: string;
  kind: TagKind;
  label: string;
  /** SF Symbol name for the chip icon (see icon-symbol fallbacks). */
  icon?: string;
  /**
   * Short rationale shown on long-press / accessibility hint.
   * Keeps the taxonomy legible for the dissertation viva.
   */
  hint: string;
};

export const LIFE_CONTEXT_TAGS: readonly TagDefinition[] = [
  // ----- Demands: work / study -------------------------------------
  {
    id: "exam",
    kind: "demand",
    label: "Exam",
    icon: "graduationcap",
    hint: "Upcoming test or assessment — classic anticipatory stressor.",
  },
  {
    id: "deadline",
    kind: "demand",
    label: "Deadline",
    icon: "clock",
    hint: "A hard date coming at you — work or personal.",
  },
  {
    id: "workload",
    kind: "demand",
    label: "Heavy workload",
    icon: "square.stack.3d.up",
    hint: "Volume of work is high, even without a single deadline.",
  },
  {
    id: "presentation",
    kind: "demand",
    label: "Speaking / viva",
    icon: "mic",
    hint: "Evaluative speaking — high arousal, social evaluation.",
  },
  // ----- Demands: money / logistics --------------------------------
  {
    id: "money",
    kind: "demand",
    label: "Money worry",
    icon: "creditcard",
    hint: "Financial pressure or uncertainty.",
  },
  {
    id: "travel",
    kind: "demand",
    label: "Travel",
    icon: "airplane",
    hint: "Disruption to routine, sleep, and circadian timing.",
  },
  {
    id: "admin",
    kind: "demand",
    label: "Admin pile-up",
    icon: "tray.full",
    hint: "Life admin backlog — appointments, forms, emails.",
  },
  // ----- Demands: social / relational ------------------------------
  {
    id: "family",
    kind: "demand",
    label: "Family",
    icon: "house",
    hint: "Family tension or caregiving load.",
  },
  {
    id: "relationship",
    kind: "demand",
    label: "Relationship",
    icon: "heart",
    hint: "Friction or distance with partner / close person.",
  },
  {
    id: "conflict",
    kind: "demand",
    label: "Conflict",
    icon: "exclamationmark.bubble",
    hint: "An argument or unresolved disagreement.",
  },
  {
    id: "loneliness",
    kind: "demand",
    label: "Loneliness",
    icon: "person",
    hint: "Feeling socially disconnected, whether alone or around people.",
  },
  // ----- Demands: body ---------------------------------------------
  {
    id: "illness",
    kind: "demand",
    label: "Feeling unwell",
    icon: "bandage",
    hint: "Cold, pain, flare-up — body is asking for slack.",
  },
  {
    id: "poor_sleep",
    kind: "demand",
    label: "Poor sleep",
    icon: "moon.zzz",
    hint: "Short or broken sleep last night.",
  },

  // ----- Resources -------------------------------------------------
  {
    id: "friends",
    kind: "resource",
    label: "Time with friends",
    icon: "person.2",
    hint: "Social connection — a core buffer against stress.",
  },
  {
    id: "family_support",
    kind: "resource",
    label: "Family support",
    icon: "house",
    hint: "Felt supported by family today.",
  },
  {
    id: "rest",
    kind: "resource",
    label: "Proper rest",
    icon: "leaf",
    hint: "Rested in a way that actually restored you.",
  },
  {
    id: "movement",
    kind: "resource",
    label: "Movement",
    icon: "figure.walk",
    hint: "Walk, workout, yoga, dance — active recovery counts.",
  },
  {
    id: "nature",
    kind: "resource",
    label: "Time outside",
    icon: "tree",
    hint: "Daylight and green space — strong restorative effect.",
  },
  {
    id: "creative",
    kind: "resource",
    label: "Creative work",
    icon: "paintbrush",
    hint: "Making something — writing, music, cooking, building.",
  },
  {
    id: "good_meal",
    kind: "resource",
    label: "Good meal",
    icon: "fork.knife",
    hint: "A meal that fed you properly — fuel matters.",
  },
  {
    id: "meditation",
    kind: "resource",
    label: "Mindfulness",
    icon: "sparkles",
    hint: "Meditation, breathwork, prayer — intentional pause.",
  },
  {
    id: "accomplishment",
    kind: "resource",
    label: "Accomplishment",
    icon: "checkmark.seal",
    hint: "Finished something that mattered to you.",
  },
] as const;

export type TagId = (typeof LIFE_CONTEXT_TAGS)[number]["id"];

const TAG_INDEX: Record<string, TagDefinition> = Object.fromEntries(
  LIFE_CONTEXT_TAGS.map((t) => [t.id, t]),
);

export function getTagDef(id: string): TagDefinition | undefined {
  return TAG_INDEX[id];
}

export function tagsByKind(kind: TagKind): TagDefinition[] {
  return LIFE_CONTEXT_TAGS.filter((t) => t.kind === kind);
}

/**
 * Count demands and resources in a tag list. Used by downstream
 * derivation of legacy scales and cognitive load.
 */
export function tagBalance(
  tags: { id: string }[] | undefined,
): { demands: number; resources: number } {
  if (!tags?.length) return { demands: 0, resources: 0 };
  let demands = 0;
  let resources = 0;
  for (const t of tags) {
    const def = TAG_INDEX[t.id];
    if (!def) continue;
    if (def.kind === "demand") demands += 1;
    else resources += 1;
  }
  return { demands, resources };
}

/**
 * Demand pressure in the [-1, 1] range.
 *   +1  → overwhelmingly demand-heavy
 *    0  → balanced or no tags
 *   -1  → overwhelmingly resource-heavy
 * Using the difference over the sum is the classic "appraisal balance"
 * shape from Lazarus & Folkman, bounded so small n doesn't explode it.
 */
export function demandPressure(
  tags: { id: string }[] | undefined,
): number {
  const { demands, resources } = tagBalance(tags);
  const total = demands + resources;
  if (total === 0) return 0;
  return (demands - resources) / total;
}
