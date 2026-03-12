import { strict as assert } from "assert";
import { normalizeCycleToWearable } from "../backend/whoop";

const fixture = {
  score: {
    recovery_score: { recovery_score: 72 },
    sleep_awake_time_state_times: { asleep: 28800 }, // 8h
    strain: 10.5,
  },
};

const fixtureMissing = {
  score: {
    recovery_score: null,
    sleep_awake_time_state_times: null,
  },
};

function testNormalizeHappy() {
  const w = normalizeCycleToWearable(fixture as any);
  assert.equal(w?.recovery, 72);
  assert.equal(w?.sleepHours, 8);
  assert.equal(w?.strain, 10.5);
  assert.equal(w?.source, "WHOOP");
}

function testNormalizeEmpty() {
  const w = normalizeCycleToWearable(fixtureMissing as any);
  assert.equal(w, null);
}

testNormalizeHappy();
testNormalizeEmpty();
console.log("whoop-normalize tests passed");
