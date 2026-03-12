import test from "node:test";
import assert from "node:assert/strict";
import { runModelEvaluation } from "@/lib/ml/eval";

test("ml eval requires sufficient data", async () => {
  await assert.rejects(runModelEvaluation());
});

