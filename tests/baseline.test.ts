import test from "node:test";
import assert from "node:assert/strict";
import { computeBaselineMeta } from "@/lib/baseline";

const mock = [
  { date: "2025-01-01", lbi: 60 },
  { date: "2025-01-02", lbi: 62 },
  { date: "2025-01-03", lbi: 64 },
  { date: "2025-01-04", lbi: 66 },
  { date: "2025-01-05", lbi: 68 },
];

test("baseline median/iqr/coverage", async () => {
  const res = await computeBaselineMeta(5, mock as any);
  assert.equal(res.baseline.median, 64);
  assert.equal(res.baseline.iqr, 4);
  assert.equal(res.baseline.coverage, 100);
});

