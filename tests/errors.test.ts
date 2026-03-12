import test from "node:test";
import assert from "node:assert/strict";
import { AppError, toAppError } from "@/lib/errors";

test("toAppError maps auth errors", () => {
  const e = toAppError(new Error("Unauthorized"), "fallback");
  assert.equal(e.code, "AUTH");
});

test("toAppError preserves AppError", () => {
  const x = new AppError("VALIDATION", "Bad input");
  const out = toAppError(x);
  assert.equal(out, x);
});
