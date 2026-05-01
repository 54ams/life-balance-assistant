import React from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { router, useNavigation } from "expo-router";
import * as Haptics from "expo-haptics";

import { Colors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { IconSymbol } from "@/components/ui/icon-symbol";

type Props = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  // Where to land if the back-stack is empty (e.g. a deep link landed the
  // user directly on a subpage). Defaults to the Me/Profile tab root.
  fallback?: string;
  // Hide the back button (e.g. for screens that are themselves a tab root
  // but still want to share the header style).
  showBack?: boolean;
};

/**
 * Shared subpage header used across Profile/Me, Insights, and Check-in
 * subpages. Single source of truth for back-button placement, the
 * eyebrow/title typography pair, and "no history → fallback to tab root"
 * behaviour. Replaces the ad-hoc Pressable+chevron snippets that drifted
 * across subpages.
 */
export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  fallback = "/profile",
  showBack = true,
}: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const nav = useNavigation();

  const onBack = () => {
    Haptics.selectionAsync().catch(() => {});
    // canGoBack is the closest reliable check for "is there history in
    // the current stack". When false, fall through to the tab-root
    // fallback so the user is never trapped on a subpage they were deep-
    // linked into.
    const canGoBack = (nav as any)?.canGoBack?.() ?? false;
    if (canGoBack) {
      router.back();
    } else {
      router.replace(fallback as any);
    }
  };

  return (
    <View style={styles.wrap}>
      {showBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backBtn,
            { borderColor: c.border.medium, backgroundColor: c.glass.primary },
            pressed && { opacity: 0.7 },
          ]}
        >
          <IconSymbol name="chevron.left" size={18} color={c.text.primary} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <Text
            style={{
              color: c.text.tertiary,
              fontSize: Typography.fontSize.xs,
              fontFamily: Typography.fontFamily.bold,
              letterSpacing: Typography.letterSpacing.allcaps,
              fontWeight: "800",
            }}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text
          style={{
            color: c.text.primary,
            fontSize: 28,
            lineHeight: 34,
            fontFamily: Typography.fontFamily.serifItalic,
            letterSpacing: -0.3,
            marginTop: eyebrow ? 2 : 0,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: Spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
});
