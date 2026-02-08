/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

/**
 * Inspo-aligned palette (deep plum + soft neutrals + lavender/mint accents)
 * - Primary: deep plum
 * - Background: soft off-white / deep near-black plum
 * - Surfaces/cards: elevated neutrals
 * - Text: high contrast with muted secondary
 */
const tintColorLight = "#2B124C"; // primary plum
const tintColorDark = "#DFB6B2"; // warm blush highlight (used for selected states)

/**
 * Optional semantic colors (kept consistent across themes)
 */
const dangerLight = "#D64550";
const dangerDark = "#FF7A86";
const successLight = "#2FA37A";
const successDark = "#57D6A4";

export const Colors = {
  light: {
    // Core
    text: "#190019", // deep plum-black
    background: "#FBE4D8", // soft blush/off-white from your palette
    tint: tintColorLight,

    // Navigation / icons
    icon: "#5D6B6B",
    tabIconDefault: "#5D6B6B",
    tabIconSelected: tintColorLight,

    // App surfaces
    card: "#F1F7F7", // soft light surface
    surface: "#FFFFFF", // highest elevation (optional)
    border: "#E6D6D6", // subtle divider
    muted: "#5D6B6B", // secondary text

    // Brand / actions
    primary: "#2B124C",
    secondary: "#522B5B", // secondary plum
    accent: "#854F6C", // mauve accent

    // Status
    danger: dangerLight,
    success: successLight,

    // Optional: for charts/indicators
    ring: "#854F6C",

    // Glass UI tokens (used by Card / surfaces)
    glass: "rgba(255,255,255,0.62)",
    glassBorder: "rgba(25,0,25,0.10)",
    shadow: "rgba(25,0,25,0.10)",
  },
  dark: {
    // Core
    text: "#FBE4D8", // warm off-white
    background: "#190019", // deep plum
    tint: tintColorDark,

    // Navigation / icons
    icon: "#D1B7B7",
    tabIconDefault: "#D1B7B7",
    tabIconSelected: tintColorDark,

    // App surfaces
    card: "#2B124C", // elevated surface (deep plum)
    surface: "#1F0A24", // highest elevation (optional)
    border: "#3A1A3E",
    muted: "#D1B7B7",

    // Brand / actions
    primary: "#DFB6B2", // warm blush for CTA highlights in dark mode
    secondary: "#854F6C",
    accent: "#FBE4D8",

    // Status
    danger: dangerDark,
    success: successDark,

    // Optional
    ring: "#DFB6B2",

    // Glass UI tokens (used by Card / surfaces)
    glass: "rgba(43,18,76,0.48)",
    glassBorder: "rgba(251,228,216,0.12)",
    shadow: "rgba(0,0,0,0.35)",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
