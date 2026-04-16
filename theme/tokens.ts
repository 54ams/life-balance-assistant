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

// Tokens aligned with the nocturnal aurora palette in constants/Colors.ts.
// Accent gradient defaults to the neutral violet bridge state.

export const LightTheme = {
  ...base,
  backgroundPrimary: "#EFECF7",
  backgroundSecondary: "#F5F3FA",
  backgroundTertiary: "#FFFFFF",
  glassBackground: "rgba(255,255,255,0.58)",
  glassBorder: "rgba(26,29,40,0.06)",
  glassOverlay: "rgba(26,29,40,0.08)",
  accentGradientPrimary: ["#6B5DD3", "#9B8FD6"],
  accentGradientSoft: ["#E2DCFB", "#B7AEE3"],
  accentDanger: "#D64550",
  accentSuccess: "#2FA37A",
  accentWarning: "#D97706",
  glowPrimary: "rgba(155,143,214,0.28)",
  glowSoft: "rgba(183,174,227,0.22)",
  glowStrong: "rgba(107,93,211,0.32)",
  textPrimary: "#1A1D28",
  textSecondary: "#50556B",
  textTertiary: "#6E7391",
  textMuted: "#8B8FA3",
  shadowSoft: "rgba(26,29,40,0.08)",
  shadowMedium: "rgba(26,29,40,0.15)",
};

export const DarkTheme: AppTheme = {
  ...base,
  backgroundPrimary: "#0A0E1A",
  backgroundSecondary: "#141826",
  backgroundTertiary: "#1A1F30",
  glassBackground: "rgba(255,255,255,0.045)",
  glassBorder: "rgba(255,255,255,0.08)",
  glassOverlay: "rgba(10,14,26,0.45)",
  accentGradientPrimary: ["#9B8FD6", "#B7AEE3"],
  accentGradientSoft: ["#1A1F30", "#141826"],
  accentDanger: "#FF7A86",
  accentSuccess: "#8ECCBF",
  accentWarning: "#F4C07A",
  glowPrimary: "rgba(155,143,214,0.32)",
  glowSoft: "rgba(127,197,184,0.22)",
  glowStrong: "rgba(232,168,124,0.28)",
  textPrimary: "#EDEFF7",
  textSecondary: "#C1C5D8",
  textTertiary: "#A1A6BD",
  textMuted: "#6B708A",
  shadowSoft: "rgba(0,0,0,0.25)",
  shadowMedium: "rgba(0,0,0,0.35)",
};

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === "dark" ? DarkTheme : LightTheme;
}
