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

export const LightTheme = {
  ...base,
  backgroundPrimary: "#F6F7FB",
  backgroundSecondary: "#EEF0F7",
  backgroundTertiary: "#E6E8F0",
  glassBackground: "rgba(255,255,255,0.55)",
  glassBorder: "rgba(0,0,0,0.06)",
  glassOverlay: "rgba(0,0,0,0.10)",
  accentGradientPrimary: ["#7AD7F0", "#8A7CFF"],
  accentGradientSoft: ["#C2E9FB", "#E2D4FF"],
  accentDanger: "#F05D76",
  accentSuccess: "#4AD4A2",
  accentWarning: "#F5C266",
  glowPrimary: "rgba(138,124,255,0.28)",
  glowSoft: "rgba(122,215,240,0.22)",
  glowStrong: "rgba(244,160,255,0.32)",
  textPrimary: "#0E0F2A",
  textSecondary: "#1F2338",
  textTertiary: "#3C405C",
  textMuted: "#6E7391",
  shadowSoft: "rgba(0,0,0,0.08)",
  shadowMedium: "rgba(0,0,0,0.15)",
};

export const DarkTheme: AppTheme = {
  ...base,
  backgroundPrimary: "#0B0D17",
  backgroundSecondary: "#101427",
  backgroundTertiary: "#141A33",
  glassBackground: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.12)",
  glassOverlay: "rgba(0,0,0,0.35)",
  accentGradientPrimary: ["#6DD3FF", "#8F7BFF"],
  accentGradientSoft: ["#23314E", "#1B273D"],
  accentDanger: "#F57A8C",
  accentSuccess: "#59E2B5",
  accentWarning: "#F4C56A",
  glowPrimary: "rgba(125,136,255,0.28)",
  glowSoft: "rgba(77,189,255,0.20)",
  glowStrong: "rgba(255,120,200,0.32)",
  textPrimary: "#EEF0FA",
  textSecondary: "#C9CDE5",
  textTertiary: "#A2A8C8",
  textMuted: "#7A819F",
  shadowSoft: "rgba(0,0,0,0.25)",
  shadowMedium: "rgba(0,0,0,0.35)",
};

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === "dark" ? DarkTheme : LightTheme;
}
