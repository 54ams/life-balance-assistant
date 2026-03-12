export const Typography = {
  // iOS System Font Stack
  fontFamily: {
    default: 'System',
    bold: 'System',
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
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};
