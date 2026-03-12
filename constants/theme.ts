import { Colors as NewColors } from "./Colors";

function compat(p: typeof NewColors.light) {
  return {
    ...p,
    text: p.text,
    border: p.border,
    glass: p.glass.primary,
    glassBorder: p.glass.border,
    // Legacy flat aliases
    textPrimary: p.text.primary,
    textSecondary: p.text.secondary,
    textTertiary: p.text.tertiary,
    muted: p.text.secondary,
    borderColor: p.border.medium,
    card: p.glass.primary,
    primary: p.accent.primary,
    secondary: p.accent.primaryLight,
    tint: p.accent.primary,
    icon: p.text.tertiary,
    success: (p as any).success ?? p.accent.primary,
    danger: (p as any).danger ?? p.accent.primary,
    warning: (p as any).warning ?? p.accent.primary,
    shadow: "rgba(0,0,0,0.12)",
  };
}

export const Colors = {
  light: compat(NewColors.light),
  dark: compat(NewColors.dark),
};

export const Fonts = {
  sans: "System",
  serif: "System",
  rounded: "System",
  mono: "System",
};
