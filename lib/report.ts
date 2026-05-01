// lib/report.ts
//
// Plain-text appendix summary used by the export flow.
// I generate this so my dissertation appendix and any participant
// export bundle share the same shape: number of records, baseline
// status, top highlights, and the standing interpretation caveats.
//
// I intentionally keep the file tiny — it composes from
// lib/analytics.ts and lib/baseline.ts rather than re-deriving stats,
// so the numbers in the report and the numbers on screen always agree.
import { buildAnalyticsSummary } from "./analytics";
import { computeBaselineMeta } from "./baseline";
import { listPlans, listDailyRecords } from "./storage";

/**
 * Build the textual appendix bundled with research/data exports.
 * Adherence here means "days where every action in the saved plan was
 * marked complete" — calling that out explicitly so the report cannot
 * accidentally sound stronger than the underlying data.
 */
export async function buildAppendixSummary(days: number): Promise<string> {
  const records = await listDailyRecords(days);
  const plans = await listPlans(days);
  const analytics = buildAnalyticsSummary(records, Math.max(days, 30));
  const baseline = await computeBaselineMeta(14);

  const adherenceDays = plans.filter((p) => {
    const completed = (p.completedActions ?? []).filter(Boolean).length;
    return p.actions.length > 0 && completed === p.actions.length;
  }).length;

  const lines: string[] = [];
  lines.push("Life Balance Assistant Appendix Summary");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`Records exported: ${records.length}`);
  lines.push(`Plans exported: ${plans.length}`);
  lines.push(`Days with LBI: ${analytics.nDaysWithLbi}`);
  lines.push(`Days with wearable: ${analytics.nDaysWithWearable}`);
  lines.push(`Days with check-in: ${analytics.nDaysWithCheckIn}`);
  lines.push(`Completed plan days: ${adherenceDays}`);
  lines.push("");
  lines.push(`Baseline status: ${baseline.status}`);
  lines.push(`Baseline days used: ${baseline.daysUsed}/${baseline.targetDays}`);
  lines.push("");
  lines.push("Key highlights:");
  analytics.highlights.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
  lines.push("Interpretation notes:");
  lines.push("- Analytics are observational and non-causal.");
  lines.push("- Model outputs are exploratory and not medical advice.");
  lines.push("- Missing data reduces confidence and can bias trends.");
  return lines.join("\n");
}
