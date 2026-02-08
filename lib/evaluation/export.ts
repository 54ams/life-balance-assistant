import type { SusSubmission } from "./storage";

function esc(v: string): string {
  // Basic CSV escaping
  if (v.includes('"') || v.includes(",") || v.includes("\n")) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

export function susSubmissionsToCsv(subs: SusSubmission[]): string {
  const header = [
    "id",
    "participantId",
    "createdAt",
    "score",
    "q1","q2","q3","q4","q5","q6","q7","q8","q9","q10",
    "feedback",
    "appVersion",
  ].join(",");

  const lines = subs.map((s) => {
    const row = [
      s.id,
      s.participantId,
      s.createdAt,
      String(s.score),
      ...s.responses.map((r) => String(r)),
      s.feedback ?? "",
      s.appVersion ?? "",
    ];
    return row.map(esc).join(",");
  });

  return [header, ...lines].join("\n");
}
