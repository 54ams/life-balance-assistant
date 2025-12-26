import { calculateLBI } from "./lbi";
import { saveCheckIn, saveDailyResult, type DailyCheckIn } from "./storage";

function yyyyMmDd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp1to5(n: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, n)) as 1 | 2 | 3 | 4 | 5;
}

export async function seedDemoData(days = 14) {
  const today = new Date();

  for (let i = days; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = yyyyMmDd(d);

    // create slightly “real” patterns
    const mood = clamp1to5(rand(2, 5));
    const stress = clamp1to5(rand(1, 5));
    const energy = clamp1to5(rand(2, 5));

    const checkIn: DailyCheckIn = {
      date,
      mood,
      stress,
      energy,
      notes: "Demo data",
    };

    // fake wearable placeholders for now
    const recovery = rand(30, 85);
    const sleepHours = rand(55, 85) / 10; // 5.5–8.5

    const { lbi } = calculateLBI({ recovery, sleepHours, checkIn });

    await saveCheckIn(checkIn);
    await saveDailyResult({ date, lbi });
  }
}
