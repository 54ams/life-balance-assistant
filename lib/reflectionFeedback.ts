// lib/reflectionFeedback.ts
//
// Lightweight on-device counter for reflection thumbs-up / thumbs-down
// signals. Kept simple: two integer counters in AsyncStorage. This lets
// us learn whether the reflections are landing for the user without
// sending any text off the device.
//
// Exported to the rest of the app through two tiny functions so the
// storage layout stays private.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "reflection_feedback_counts_v1";

export type ReflectionFeedbackVote = "up" | "down";

export type ReflectionFeedbackCounts = {
  up: number;
  down: number;
};

async function read(): Promise<ReflectionFeedbackCounts> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { up: 0, down: 0 };
  try {
    const parsed = JSON.parse(raw);
    return {
      up: Number.isFinite(parsed?.up) ? Number(parsed.up) : 0,
      down: Number.isFinite(parsed?.down) ? Number(parsed.down) : 0,
    };
  } catch {
    return { up: 0, down: 0 };
  }
}

export async function recordReflectionFeedback(vote: ReflectionFeedbackVote): Promise<void> {
  const counts = await read();
  counts[vote] += 1;
  await AsyncStorage.setItem(KEY, JSON.stringify(counts));
}

export async function getReflectionFeedbackCounts(): Promise<ReflectionFeedbackCounts> {
  return read();
}

export async function clearReflectionFeedback(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
