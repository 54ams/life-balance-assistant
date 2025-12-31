import { loadDailyResult } from "./storage";

function yyyyMmDd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function loadLastNDaysLbi(endDate: string, n: number) {
  const end = new Date(endDate);
  const values: number[] = [];

  for (let i = 1; i <= n; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const key = yyyyMmDd(d);
    const res = await loadDailyResult(key);
    if (res) values.push(res.lbi);
  }

  return values;
}

export function average(nums: number[]) {
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round(sum / nums.length);
}
export async function loadBaseline(endDate: string, windowDays = 7, minDays = 3) {
  const values = await loadLastNDaysLbi(endDate, windowDays); // excludes today already (starts at i=1)
  if (values.length < minDays) {
    return { baseline: null as number | null, daysUsed: values.length };
  }
  return { baseline: average(values), daysUsed: values.length };
}
