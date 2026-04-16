// constants/Colors.ts
//
// Nocturnal aurora palette, dark-first.
//
// The app has three *state* gradients driven by the Mind–Body bridge:
//
//   - aligned  → soft violet / periwinkle  (body + mind in step)
//   - body     → warm amber / rust          (body ahead — regulate down)
//   - mind     → cool teal / pale jade      (mind ahead — come into body)
//   - neutral  → deep indigo / violet       (no strong signal yet)
//
// The State Orb, the AuroraBackground, and any future "ripple" effects
// derive their colours from `Colors.state[<stateKey>]`. Categorical
// green/purple dichotomies are avoided — the UI itself blends to reflect
// the user's current state.

export type BridgeState = "aligned" | "body" | "mind" | "neutral";

type StateGradient = {
  start: string;
  end: string;
  accent: string;
  glow: string;
};

const stateGradients: Record<BridgeState, StateGradient> = {
  aligned: {
    start: "#9B8FD6",
    end: "#B7AEE3",
    accent: "#9B8FD6",
    glow: "rgba(155, 143, 214, 0.45)",
  },
  body: {
    start: "#E8A87C",
    end: "#C38D6E",
    accent: "#D99575",
    glow: "rgba(232, 168, 124, 0.40)",
  },
  mind: {
    start: "#7FC5B8",
    end: "#A8D0C4",
    accent: "#8ECCBF",
    glow: "rgba(127, 197, 184, 0.40)",
  },
  neutral: {
    start: "#6B5DD3",
    end: "#9B8FD6",
    accent: "#7C6FDC",
    glow: "rgba(108, 99, 214, 0.35)",
  },
};

export const Colors = {
  light: {
    // Backgrounds — soft graphite with a subtle violet tint
    background: "#EFECF7",
    backgroundSecondary: "#F5F3FA",
    backgroundTertiary: "#FFFFFF",

    // Glass morphism — lower opacity, no hard borders, feels like mist
    glass: {
      primary: "rgba(255, 255, 255, 0.58)",
      secondary: "rgba(255, 255, 255, 0.42)",
      elevated: "rgba(255, 255, 255, 0.82)",
      border: "rgba(255, 255, 255, 0.70)",
    },

    // Accent colors
    accent: {
      primary: "#6B5DD3",
      primaryLight: "#8479DD",
      primaryDark: "#5A4EC0",
    },

    // Text
    text: {
      primary: "#1A1D28",
      secondary: "#50556B",
      tertiary: "#8B8FA3",
      inverse: "#FFFFFF",
    },

    // Borders — softer, nearly invisible unless needed
    border: {
      light: "rgba(26, 29, 40, 0.05)",
      medium: "rgba(26, 29, 40, 0.08)",
      heavy: "rgba(26, 29, 40, 0.13)",
    },

    // Status
    danger: "#D64550",
    success: "#2FA37A",
    warning: "#D97706",

    // Shared state gradients (same palette light + dark, just the base shifts)
    state: stateGradients,
  },

  dark: {
    // Backgrounds — deep ink with a blue undertone
    background: "#0A0E1A",
    backgroundSecondary: "#141826",
    backgroundTertiary: "#1A1F30",

    // Glass morphism — soft, nearly borderless
    glass: {
      primary: "rgba(255, 255, 255, 0.045)",
      secondary: "rgba(255, 255, 255, 0.03)",
      elevated: "rgba(26, 31, 48, 0.75)",
      border: "rgba(255, 255, 255, 0.08)",
    },

    // Accent colors — aligned violet
    accent: {
      primary: "#9B8FD6",
      primaryLight: "#B7AEE3",
      primaryDark: "#7C6FDC",
    },

    // Text — soft off-white, never pure white
    text: {
      primary: "#EDEFF7",
      secondary: "#A1A6BD",
      tertiary: "#6B708A",
      inverse: "#0A0E1A",
    },

    // Borders — barely-there
    border: {
      light: "rgba(255, 255, 255, 0.05)",
      medium: "rgba(255, 255, 255, 0.08)",
      heavy: "rgba(255, 255, 255, 0.12)",
    },

    // Status
    danger: "#FF7A86",
    success: "#8ECCBF",
    warning: "#F4C07A",

    // Shared state gradients
    state: stateGradients,
  },
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
