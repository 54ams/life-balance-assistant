export const SUS_QUESTIONS: string[] = [
  "I think that I would like to use this system frequently.",
  "I found the system unnecessarily complex.",
  "I thought the system was easy to use.",
  "I think that I would need the support of a technical person to be able to use this system.",
  "I found the various functions in this system were well integrated.",
  "I thought there was too much inconsistency in this system.",
  "I would imagine that most people would learn to use this system very quickly.",
  "I found the system very cumbersome to use.",
  "I felt very confident using the system.",
  "I needed to learn a lot of things before I could get going with this system.",
];

export type SusResponse = 1 | 2 | 3 | 4 | 5;

export function computeSusScore(responses: SusResponse[]): number {
  if (responses.length !== 10) throw new Error("SUS requires 10 responses.");
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const r = responses[i];
    // Odd-numbered questions (1,3,5,7,9) are positive; even are negative
    const isPositive = i % 2 === 0;
    sum += isPositive ? (r - 1) : (5 - r);
  }
  return Math.round(sum * 2.5 * 10) / 10; // one decimal
}
