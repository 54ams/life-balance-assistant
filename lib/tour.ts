// lib/tour.ts
//
// App tour state management. The tour runs ONCE after onboarding/first-run
// completes. It walks the user through the key areas of the app in a
// logical order, explaining how everything connects.

import AsyncStorage from "@react-native-async-storage/async-storage";

// Bumped to v2 alongside the simplified bottom-sheet tour: the older v1 tour
// targeted specific layout rectangles that don't measure reliably on web, so
// any in-progress v1 step state would still try to render an overlay on top
// of the new design. New key starts everyone fresh.
const TOUR_KEY = "life_balance_tour_completed_v2";
const TOUR_STEP_KEY = "life_balance_tour_step_v2";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  // Kept for compatibility with existing <TourTarget id={...}> call sites;
  // the simplified overlay no longer measures these.
  target: "orb" | "ribbon" | "quick_actions" | "checkin_tab" | "insights_tab" | "profile_tab" | "habits" | "tools" | "final";
  position: "top" | "center" | "bottom";
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "home",
    title: "Home — your balance at a glance",
    description: "The orb shows how your mind and body are tracking together. The week ribbon below it lets you tap any day to see what happened.",
    target: "orb",
    position: "bottom",
  },
  {
    id: "checkin",
    title: "Check-in — log how you feel",
    description: "A quick 60-second daily check-in. This feeds into your patterns, habits, and personalised insights.",
    target: "checkin_tab",
    position: "bottom",
  },
  {
    id: "insights",
    title: "Insights — see what connects",
    description: "Trends, correlations, and weekly reflections. The more you log, the clearer the picture gets.",
    target: "insights_tab",
    position: "bottom",
  },
  {
    id: "profile",
    title: "Me — settings and tools",
    description: "Connect WHOOP, manage habits, export data for your GP, and adjust how the app behaves.",
    target: "profile_tab",
    position: "bottom",
  },
];

export async function hasCompletedTour(): Promise<boolean> {
  const val = await AsyncStorage.getItem(TOUR_KEY);
  return val === "1";
}

export async function completeTour(): Promise<void> {
  await AsyncStorage.setItem(TOUR_KEY, "1");
  await AsyncStorage.removeItem(TOUR_STEP_KEY);
}

export async function skipTour(): Promise<void> {
  await completeTour();
}

export async function getCurrentTourStep(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(TOUR_STEP_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export async function advanceTourStep(): Promise<number> {
  const current = await getCurrentTourStep();
  const next = current + 1;
  if (next >= TOUR_STEPS.length) {
    await completeTour();
    return -1; // done
  }
  await AsyncStorage.setItem(TOUR_STEP_KEY, String(next));
  return next;
}

export async function resetTour(): Promise<void> {
  await AsyncStorage.removeItem(TOUR_KEY);
  await AsyncStorage.setItem(TOUR_STEP_KEY, "0");
}
