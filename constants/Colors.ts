// constants/Colors.ts
//
// "Rival"-inspired palette — cream canvas, deep forest ink, lime accent.
// Serif italic display over warm off-white. Dark mode inverts to deep
// forest with cream text.
//
// State gradients (Mind–Body bridge) kept but retuned so they live
// comfortably on cream: sage for aligned, warm terracotta for body,
// muted teal for mind, soft olive-violet for neutral.
//
// Every palette key from the previous file is preserved so the rest of
// the app keeps compiling — only the hex values change.

export type BridgeState = "aligned" | "body" | "mind" | "neutral";

type StateGradient = {
  start: string;
  end: string;
  accent: string;
  glow: string;
};

const stateGradients: Record<BridgeState, StateGradient> = {
  aligned: {
    start: "#9CB08A",
    end: "#C2D0A8",
    accent: "#8FA672",
    glow: "rgba(156, 176, 138, 0.42)",
  },
  body: {
    start: "#C88A6B",
    end: "#D9A988",
    accent: "#B87C5E",
    glow: "rgba(200, 138, 107, 0.40)",
  },
  mind: {
    start: "#7AA49B",
    end: "#A4BFB5",
    accent: "#6F9A90",
    glow: "rgba(122, 164, 155, 0.38)",
  },
  neutral: {
    start: "#7A8470",
    end: "#A4AD96",
    accent: "#8A947E",
    glow: "rgba(138, 148, 126, 0.32)",
  },
};

const theme = {
  // Canvas — warm cream, the "paper" of the app
  background: "#EFE8D9",
  backgroundSecondary: "#F4EFE2",
  backgroundTertiary: "#F9F5EA",

  // Glass morphism on cream — barely visible, warm white
  glass: {
    primary: "rgba(255, 252, 244, 0.62)",
    secondary: "rgba(255, 252, 244, 0.42)",
    elevated: "rgba(255, 252, 244, 0.88)",
    border: "rgba(44, 54, 42, 0.10)",
  },

  // Accent — lime chartreuse for primary action, forest for emphasis
  accent: {
    primary: "#2C362A",
    primaryLight: "#4A5648",
    primaryDark: "#1B241A",
  },

  // Lime highlight — used for buttons, active states, "action" moments
  lime: "#C7E86A",
  limeMuted: "#B8D95C",
  limeDark: "#8FA83C",

  // Text — warm charcoal on cream
  text: {
    primary: "#2C362A",
    secondary: "#5E6858",
    tertiary: "#8A9086",
    inverse: "#EFE8D9",
  },

  // Borders — barely-there forest tint
  border: {
    light: "rgba(44, 54, 42, 0.06)",
    medium: "rgba(44, 54, 42, 0.10)",
    heavy: "rgba(44, 54, 42, 0.16)",
  },

  // Status — tuned to the cream world
  danger: "#B2423A",
  success: "#5B7A3E",
  warning: "#C2824A",

  // Text on accent.primary buttons
  onPrimary: "#FFFFFF",

  state: stateGradients,
};

// Single theme — both "light" and "dark" keys resolve to the same palette
// so all existing `Colors[scheme ?? "light"]` patterns keep working.
export const Colors = {
  light: theme,
  dark: theme,
};

/**
 * Map a bridge gap + direction to a BridgeState key.
 * Centralised so the orb, aurora, and any future ripple all agree.
 */
export function bridgeStateFrom(
  physio: number | null,
  mental: number | null,
): BridgeState {
  if (physio == null || mental == null) return "neutral";
  const gap = physio - mental;
  if (Math.abs(gap) <= 10) return "aligned";
  return gap > 0 ? "body" : "mind";
}
