import test from "node:test";
import assert from "node:assert/strict";
import { filterSusByRetention } from "@/lib/evaluation/storage";

test("filterSusByRetention keeps only recent submissions", () => {
  const now = new Date("2026-02-28T12:00:00.000Z");
  const list = [
    {
      id: "a",
      participantId: "P-1",
      createdAt: "2026-02-27T10:00:00.000Z",
      responses: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      score: 50,
    },
    {
      id: "b",
      participantId: "P-1",
      createdAt: "2025-12-01T10:00:00.000Z",
      responses: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      score: 50,
    },
  ] as any;

  const out = filterSusByRetention(list, 30, now);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "a");
});
