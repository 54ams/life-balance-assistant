import { listPlans } from "./storage";

/**
 * Returns a JSON string the user can copy into their evaluation appendix.
 */
export async function exportPlans(days: number): Promise<string> {
  const data = await listPlans(days);
  const payload = {
    exportedAt: new Date().toISOString(),
    days,
    data,
  };
  return JSON.stringify(payload, null, 2);
}
