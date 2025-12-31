import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  // Don’t crash the server on boot; throw on request instead if you prefer.
  console.warn("WARN: OPENAI_API_KEY is missing (backend/.env).");
}

const client = new OpenAI({ apiKey });

export async function explainPlan(prompt: string, context?: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in backend/.env");
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    input: [
      {
        role: "system",
        content:
          "You are a wellbeing assistant. Be brief, practical, non-judgmental. No medical claims. Avoid diagnosis.",
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
