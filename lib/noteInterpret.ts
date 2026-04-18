// lib/noteInterpret.ts
//
// Interpret the user's free-text note into *suggestions* the user can
// confirm or discard before they count as signal. Human-in-the-loop
// extraction, per Shneiderman's responsible-AI guidance and consistent
// with Doshi-Velez & Kim's transparency argument for XAI in user-
// facing systems: derived facts must be visible and rejectable.
//
// Two tiers:
//   1. localMatch()  — zero-network, keyword/regex matcher. Always on.
//   2. llmDeeperRead() — opt-in per check-in, calls the existing LLM
//      endpoint with *redacted* text and asks for a structured JSON
//      shape of the same shape as localMatch, with a sentiment hint.
//
// PII redaction runs before any text leaves the device.

import { containsSelfHarmSignals } from "./privacy";
import { getBackendBaseUrl } from "./backend";
import { LIFE_CONTEXT_TAGS, type TagDefinition } from "./lifeContext";

// -----------------------------------------------------------------
// PII redaction
// -----------------------------------------------------------------

// UK postcode pattern (ish — AA9A 9AA / A9A 9AA / A9 9AA / A99 9AA etc.)
const UK_POSTCODE_RE =
  /\b[A-PR-UWYZ]{1,2}\d[A-Z\d]?\s*\d[ABD-HJLNP-UW-Z]{2}\b/gi;

// Email addresses.
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

// @-handles (Twitter, Instagram, TikTok) — 2–30 word chars.
const HANDLE_RE = /(^|\s)@[A-Za-z0-9_]{2,30}/g;

// Phone numbers — loose: 7+ digits with optional +, spaces, dashes.
const PHONE_RE = /(?:\+?\d[\d\s\-().]{6,}\d)/g;

// URLs — very simple.
const URL_RE = /\bhttps?:\/\/\S+/gi;

/**
 * Replace identifying substrings with tokens. Preserves rough length
 * so the LLM still gets a sensible sentence shape. Pure function —
 * easy to unit-test for the dissertation.
 */
export function redactPII(input: string): {
  text: string;
  counts: { emails: number; phones: number; handles: number; postcodes: number; urls: number };
} {
  let text = input;
  let emails = 0;
  let phones = 0;
  let handles = 0;
  let postcodes = 0;
  let urls = 0;

  text = text.replace(EMAIL_RE, () => {
    emails += 1;
    return "[email]";
  });
  text = text.replace(URL_RE, () => {
    urls += 1;
    return "[link]";
  });
  text = text.replace(UK_POSTCODE_RE, () => {
    postcodes += 1;
    return "[postcode]";
  });
  text = text.replace(PHONE_RE, (m) => {
    // Keep small standalone numbers (like "2am", "3 hours") untouched
    // by bailing out on matches shorter than 7 digits.
    const digits = m.replace(/\D/g, "");
    if (digits.length < 7) return m;
    phones += 1;
    return "[phone]";
  });
  text = text.replace(HANDLE_RE, (_, prefix) => {
    handles += 1;
    return `${prefix}[handle]`;
  });

  return { text, counts: { emails, phones, handles, postcodes, urls } };
}

// -----------------------------------------------------------------
// Local keyword matcher — always on, no network.
// -----------------------------------------------------------------

/**
 * Minimal cue → tag map. Chosen to be high-precision on short notes;
 * the LLM step can pick up anything this misses. Matches are
 * case-insensitive and whole-word where it matters.
 */
const CUE_MAP: Array<{ re: RegExp; tagId: string }> = [
  { re: /\b(exam|test|viva|final|midterm|paper due)\b/i, tagId: "exam" },
  { re: /\b(deadline|due tomorrow|due today|cut[- ]off)\b/i, tagId: "deadline" },
  { re: /\b(workload|swamped|drowning|piled up|back[- ]to[- ]back)\b/i, tagId: "workload" },
  { re: /\b(presentation|present to|pitch|viva)\b/i, tagId: "presentation" },
  { re: /\b(money|bill|rent|broke|skint|overdraft|loan)\b/i, tagId: "money" },
  { re: /\b(flight|train|airport|travel|commute)\b/i, tagId: "travel" },
  { re: /\b(admin|paperwork|forms?|inbox|emails?)\b/i, tagId: "admin" },
  { re: /\b(mum|mom|dad|mother|father|sibling|brother|sister|parents?)\b/i, tagId: "family" },
  { re: /\b(partner|boyfriend|girlfriend|husband|wife|breakup)\b/i, tagId: "relationship" },
  { re: /\b(argued|fight|row|fell out|conflict)\b/i, tagId: "conflict" },
  { re: /\b(lonely|alone|isolated|no one)\b/i, tagId: "loneliness" },
  { re: /\b(sick|ill|cold|flu|headache|migraine|period)\b/i, tagId: "illness" },
  { re: /\b(slept badly|no sleep|couldn'?t sleep|insomnia|woke up \w+)\b/i, tagId: "poor_sleep" },
  { re: /\b(friends?|mates?|hang out|catch up|dinner with)\b/i, tagId: "friends" },
  { re: /\b(rested|rest day|lie[- ]?in|nap)\b/i, tagId: "rest" },
  { re: /\b(walk|run|gym|yoga|workout|lift|ride|swim|dance)\b/i, tagId: "movement" },
  { re: /\b(outside|park|nature|woods|forest|beach|garden)\b/i, tagId: "nature" },
  { re: /\b(wrote|painted|baked|cooked|built|made|music|studio)\b/i, tagId: "creative" },
  { re: /\b(meditate|breathwork|mindful|prayer|yoga)\b/i, tagId: "meditation" },
  { re: /\b(finished|shipped|submitted|handed in|done|wrapped up)\b/i, tagId: "accomplishment" },
];

export type NoteSuggestion = {
  tagId: string;
  kind: "demand" | "resource";
  label: string;
  /** The substring from the user's note that triggered this suggestion. */
  trigger: string;
  source: "local" | "llm";
  /** 0..1 — local matches are high precision but we mark 0.7 to leave room for LLM. */
  confidence: number;
};

/**
 * Scan the note for known cues and return tag suggestions. Each
 * suggestion carries the matched text so the confirm-chip UI can
 * show the user exactly *why* we think this tag applies.
 */
export function localMatch(note: string): NoteSuggestion[] {
  if (!note.trim()) return [];
  const out: NoteSuggestion[] = [];
  const seen = new Set<string>();
  const tagIndex: Record<string, TagDefinition> = Object.fromEntries(
    LIFE_CONTEXT_TAGS.map((t) => [t.id, t]),
  );

  for (const { re, tagId } of CUE_MAP) {
    if (seen.has(tagId)) continue;
    const m = re.exec(note);
    if (!m) continue;
    const def = tagIndex[tagId];
    if (!def) continue;
    out.push({
      tagId,
      kind: def.kind,
      label: def.label,
      trigger: m[0],
      source: "local",
      confidence: 0.7,
    });
    seen.add(tagId);
  }
  return out;
}

// -----------------------------------------------------------------
// Naive sentiment from the note — used as one of four triangulation
// modalities. Bounded to [-1, 1] with zero on no signal.
// -----------------------------------------------------------------

const POS_CUES =
  /\b(good|great|happy|calm|grateful|proud|love|loved|easy|smooth|energ(ised|y)|fresh|rested|productive|content|peaceful)\b/gi;
const NEG_CUES =
  /\b(bad|awful|terrible|anxious|stressed|worried|tired|exhaust(ed|ing)|overwhelm(ed|ing)|angry|sad|lonely|scared|hopeless|burnt? out)\b/gi;

export function localSentiment(note: string): number {
  if (!note.trim()) return 0;
  const pos = (note.match(POS_CUES) ?? []).length;
  const neg = (note.match(NEG_CUES) ?? []).length;
  const total = pos + neg;
  if (total === 0) return 0;
  return (pos - neg) / total;
}

// -----------------------------------------------------------------
// Opt-in LLM deeper read. Returns structured suggestions + a
// sentiment hint. Always redacts before sending. Never throws — the
// local matcher is the floor.
// -----------------------------------------------------------------

export type LlmReadResult = {
  suggestions: NoteSuggestion[];
  sentiment: number; // -1..1
  source: "llm" | "local" | "safety";
  /** True when we bailed out because of a safety signal. */
  safetyStopped?: boolean;
};

type LlmShape = {
  tags?: Array<{ id?: string; trigger?: string; confidence?: number }>;
  sentiment?: number;
};

/** Allow-list against the taxonomy so the LLM can't invent tag ids. */
function filterSuggestions(
  raw: LlmShape | null,
): { suggestions: NoteSuggestion[]; sentiment: number } {
  const tagIndex: Record<string, TagDefinition> = Object.fromEntries(
    LIFE_CONTEXT_TAGS.map((t) => [t.id, t]),
  );
  const suggestions: NoteSuggestion[] = [];
  for (const t of raw?.tags ?? []) {
    if (!t?.id) continue;
    const def = tagIndex[t.id];
    if (!def) continue;
    suggestions.push({
      tagId: def.id,
      kind: def.kind,
      label: def.label,
      trigger: (t.trigger ?? "").slice(0, 60),
      source: "llm",
      confidence: Math.max(0, Math.min(1, Number(t.confidence) || 0.6)),
    });
  }
  let sentiment = Number(raw?.sentiment);
  if (!Number.isFinite(sentiment)) sentiment = 0;
  sentiment = Math.max(-1, Math.min(1, sentiment));
  return { suggestions, sentiment };
}

function mergeSuggestions(
  local: NoteSuggestion[],
  llm: NoteSuggestion[],
): NoteSuggestion[] {
  const out: NoteSuggestion[] = [...local];
  const ids = new Set(local.map((s) => s.tagId));
  for (const s of llm) {
    if (ids.has(s.tagId)) continue;
    out.push(s);
    ids.add(s.tagId);
  }
  return out;
}

/**
 * Ask the backend to parse a note into tag suggestions + sentiment.
 * - Safety-gates self-harm language first.
 * - Redacts PII before the request.
 * - Falls back to the local matcher on any failure.
 */
export async function llmDeeperRead(note: string): Promise<LlmReadResult> {
  const trimmed = note.trim();
  if (!trimmed) {
    return { suggestions: [], sentiment: 0, source: "local" };
  }

  if (containsSelfHarmSignals(trimmed)) {
    return {
      suggestions: localMatch(trimmed),
      sentiment: localSentiment(trimmed),
      source: "safety",
      safetyStopped: true,
    };
  }

  const { text: redacted } = redactPII(trimmed);
  const local = localMatch(trimmed);
  const localSent = localSentiment(trimmed);

  const base = getBackendBaseUrl();
  if (!base) {
    return { suggestions: local, sentiment: localSent, source: "local" };
  }
  const url = `${base}/explain`;

  const allowed = LIFE_CONTEXT_TAGS.map((t) => `${t.id} (${t.kind})`).join(", ");
  const prompt = `You read a one-line wellbeing note and extract structured context.
Allowed tag ids (use ONLY these): ${allowed}.
Respond as JSON with shape:
  { "tags": [ { "id": "<tag id>", "trigger": "<short span from note>", "confidence": 0..1 } ],
    "sentiment": -1..1 }
Rules: no diagnosis, no advice, no identifying details. If nothing fits, return empty tags. Sentiment: -1 very unpleasant, 0 neutral, +1 very pleasant. Keep triggers under 8 words.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, context: `note:${redacted}`, format: "json" }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { suggestions: local, sentiment: localSent, source: "local" };
    }
    const body = (await res.json()) as { text?: string };
    const raw = body.text?.trim();
    if (!raw) {
      return { suggestions: local, sentiment: localSent, source: "local" };
    }
    let parsed: LlmShape | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Some models wrap JSON in ```json fences — salvage it.
      const fenced = raw.match(/\{[\s\S]*\}/);
      if (fenced) {
        try {
          parsed = JSON.parse(fenced[0]);
        } catch {
          parsed = null;
        }
      }
    }
    if (!parsed) {
      return { suggestions: local, sentiment: localSent, source: "local" };
    }
    const { suggestions: llmSuggestions, sentiment } = filterSuggestions(parsed);
    return {
      suggestions: mergeSuggestions(local, llmSuggestions),
      sentiment: sentiment || localSent,
      source: "llm",
    };
  } catch {
    return { suggestions: local, sentiment: localSent, source: "local" };
  } finally {
    clearTimeout(timeoutId);
  }
}
