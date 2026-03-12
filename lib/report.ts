import { buildAnalyticsSummary } from "./analytics";
import { computeBaselineMeta } from "./baseline";
import { listPlans, listDailyRecords } from "./storage";

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
