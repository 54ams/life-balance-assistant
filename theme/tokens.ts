import { useColorScheme } from "@/hooks/use-color-scheme";

export type AppTheme = typeof LightTheme;

const base = {
  radiusSmall: 10,
  radiusMedium: 16,
  radiusLarge: 22,
  radiusOrb: 80,
  spacingXS: 4,
  spacingSM: 8,
  spacingMD: 12,
  spacingLG: 16,
  spacingXL: 24,
  spacingXXL: 32,
};

// Tokens aligned with the Rival-inspired cream/forest/lime palette
// in constants/Colors.ts. State gradients are sage/terracotta/teal.

export const LightTheme = {
  ...base,
  backgroundPrimary: "#EFE8D9",
  backgroundSecondary: "#F4EFE2",
  backgroundTertiary: "#F9F5EA",
  glassBackground: "rgba(255,252,244,0.62)",
  glassBorder: "rgba(44,54,42,0.10)",
  glassOverlay: "rgba(44,54,42,0.08)",
  accentGradientPrimary: ["#2C362A", "#4A5648"],
  accentGradientSoft: ["#C2D0A8", "#9CB08A"],
  accentDanger: "#B2423A",
  accentSuccess: "#5B7A3E",
  accentWarning: "#C2824A",
  glowPrimary: "rgba(156,176,138,0.28)",
  glowSoft: "rgba(199,232,106,0.22)",
  glowStrong: "rgba(44,54,42,0.32)",
  textPrimary: "#2C362A",
  textSecondary: "#5E6858",
  textTertiary: "#8A9086",
  textMuted: "#A0A69C",
  shadowSoft: "rgba(44,54,42,0.08)",
  shadowMedium: "rgba(44,54,42,0.15)",
};

export const DarkTheme: AppTheme = {
  ...base,
  backgroundPrimary: "#1B241A",
  backgroundSecondary: "#222D20",
  backgroundTertiary: "#2C362A",
  glassBackground: "rgba(239,232,217,0.06)",
  glassBorder: "rgba(239,232,217,0.10)",
  glassOverlay: "rgba(27,36,26,0.45)",
  accentGradientPrimary: ["#EFE8D9", "#F4EFE2"],
  accentGradientSoft: ["#2C362A", "#222D20"],
  accentDanger: "#E08078",
  accentSuccess: "#A8C872",
  accentWarning: "#E0B278",
  glowPrimary: "rgba(156,176,138,0.32)",
  glowSoft: "rgba(199,232,106,0.22)",
  glowStrong: "rgba(200,138,107,0.28)",
  textPrimary: "#EFE8D9",
  textSecondary: "#BFB8A8",
  textTertiary: "#8A8578",
  textMuted: "#6B6860",
  shadowSoft: "rgba(0,0,0,0.25)",
  shadowMedium: "rgba(0,0,0,0.35)",
};

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === "dark" ? DarkTheme : LightTheme;
}
