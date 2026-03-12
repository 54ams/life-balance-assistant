import test from "node:test";
import assert from "node:assert/strict";
import { containsSelfHarmSignals, hashParticipantId } from "@/lib/privacy";

test("participant hash is stable and redacts raw id", () => {
  const raw = "participant-abc-123";
  const a = hashParticipantId(raw);
  const b = hashParticipantId(raw);
  assert.equal(a, b);
  assert.ok(a.startsWith("p_"));
  assert.notEqual(a, raw);
});

test("self-harm detector catches direct phrases", () => {
  assert.equal(containsSelfHarmSignals("I want to kill myself"), true);
  assert.equal(containsSelfHarmSignals("today was hard but safe"), false);
});
