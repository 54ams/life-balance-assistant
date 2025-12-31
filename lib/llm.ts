
const LLM_URL = "http://192.168.1.148:3333/explain";

export async function generateExplanation(prompt: string, context?: string) {
  try {
    const res = await fetch(LLM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        context,
      }),
    });

    if (!res.ok) {
      throw new Error(`LLM error ${res.status}`);
    }

    const data = await res.json();
    return data.text as string;
  } catch (err) {
    console.error("LLM failed:", err);
    return null;
  }
}
