// lib/tour.ts
//
// App tour state management. The tour runs ONCE after onboarding/first-run
// completes. It walks the user through the key areas of the app in a
// logical order, explaining how everything connects.

import AsyncStorage from "@react-native-async-storage/async-storage";

const TOUR_KEY = "life_balance_tour_completed_v1";
const TOUR_STEP_KEY = "life_balance_tour_step_v1";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  target: "orb" | "ribbon" | "quick_actions" | "checkin_tab" | "insights_tab" | "profile_tab" | "habits" | "tools" | "final";
  position: "top" | "center" | "bottom";
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome_back",
    title: "Welcome to your space",
    description: "This is your home — the orb reflects how your mind and body are tracking together. Everything in this app is connected.",
    target: "orb",
    position: "center",
  },
  {
    id: "ribbon",
    title: "Your week at a glance",
    description: "The ribbon shows your last 7 days. Tap any day to see what happened — look for patterns over time.",
    target: "ribbon",
    position: "center",
  },
  {
    id: "quick_actions",
    title: "Your daily toolkit",
    description: "Quick access to tools that work together: breathe to calm, check in to track, build habits, or reframe thoughts.",
    target: "quick_actions",
    position: "center",
  },
  {
    id: "checkin",
    title: "Check in daily",
    description: "A 60-second check-in captures how you feel. This feeds into your patterns, habits, and personalised insights.",
    target: "checkin_tab",
    position: "bottom",
  },
  {
    id: "insights",
    title: "See what's connected",
    description: "Insights show how your habits, sleep, mood, and body data relate to each other. The more you log, the smarter it gets.",
    target: "insights_tab",
    position: "bottom",
  },
  {
    id: "profile",
    title: "Your settings & tools",
    description: "Connect wearables, manage habits, track sleep hygiene, export data for your GP, and customise your experience.",
    target: "profile_tab",
    position: "bottom",
  },
  {
    id: "interconnection",
    title: "Everything connects",
    description: "Habits affect mood. Sleep affects energy. Thoughts affect behaviour. This app makes those connections visible so you can act on them.",
    target: "final",
    position: "center",
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
