import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  // Don’t crash the server on boot; throw on request instead if you prefer.
  console.warn("WARN: OPENAI_API_KEY is missing (backend/.env).");
}

const client = new OpenAI({ apiKey });

function hasSelfHarmSignals(text: string): boolean {
  const t = text.toLowerCase();
  const cues = [
    "suicide",
    "kill myself",
    "self-harm",
    "self harm",
    "end my life",
    "hurt myself",
  ];
  return cues.some((c) => t.includes(c));
}

export async function explainPlan(prompt: string, context?: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in backend/.env");
  }

  const joined = `${prompt}\n${context ?? ""}`;
  if (hasSelfHarmSignals(joined)) {
    return "I can't reflect on this content safely. If you may be in immediate danger, please call 999. If you need someone to talk to, Samaritans are free and available any time on 116 123.";
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    input: [
      {
        role: "system",
        content:
          "You are a wellbeing reflection assistant. Be brief, non-judgmental, observational, and non-directive. Not medical advice. No diagnosis. No crisis management instructions.",
      },
      {
        role: "user",
        content: (context ? `Context:\n${context}\n\n` : "") + `Task:\n${prompt}`,
      },
    ],
    max_output_tokens: 140,
    temperature: 0.6,
  });

  return response.output_text ?? "No explanation returned.";
}
