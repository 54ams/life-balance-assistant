// constants/Typography.ts
//
// Font tokens for the "Rival"-inspired look:
//   - Display:   Cormorant Garamond (serif, italic for emphasis)
//   - Body/UI:   Inter (sans)
//   - Labels:    Inter uppercase with tracking (the "TAKE THE QUIZ" look)
//
// Font family strings here MUST match the keys used in the useFonts()
// call in app/_layout.tsx.

export const Typography = {
  fontFamily: {
    default: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",

    // Serif display — italic is the hero
    serif: "CormorantGaramond_500Medium",
    serifItalic: "CormorantGaramond_500Medium_Italic",
    serifBold: "CormorantGaramond_700Bold",
    serifBoldItalic: "CormorantGaramond_700Bold_Italic",
  },

  // Font Sizes (iOS HIG scale)
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 22,
    xxl: 28,
    xxxl: 34,
    display: 48,
  },

  // Font Weights
  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },

  // Letter spacing presets
  letterSpacing: {
    tight: -0.3,
    normal: 0,
    wide: 0.4,
    allcaps: 1.4,
  },
};
