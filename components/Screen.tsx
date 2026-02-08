import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useMemo } from "react";
import {
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  decorated?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

export function Screen({
  children,
  scroll = false,
  padded = true,
  decorated = true,
  style,
  contentStyle,
}: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const insets = useSafeAreaInsets();

  const basePadding: ViewStyle = padded
    ? { paddingHorizontal: 18, paddingBottom: 22 }
    : {};

  const topPad = Platform.OS === "android" ? insets.top + 12 : insets.top;

  // Defensive: if any screen accidentally renders a raw string/number inside <Screen>,
  // React Native will throw "Text strings must be rendered within a <Text> component".
  // Wrap primitive children so the app never hard-crashes in production/demo.
  const safeChildren = React.Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return <Text style={{ color: c.text }}>{String(child)}</Text>;
    }
    return child;
  });

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
        {decorated ? <NebulaBackground /> : null}
        <ScrollView
          style={[styles.fill, style]}
          contentContainerStyle={[
            { paddingTop: topPad },
            basePadding,
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {safeChildren}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      {decorated ? <NebulaBackground /> : null}
      <View
        style={[
          styles.fill,
          { paddingTop: topPad },
          basePadding,
          style,
        ]}
      >
        {safeChildren}
      </View>
    </SafeAreaView>
  );
}

/**
 * Deterministic starfield + soft nebula washes.
 * No image assets needed, and it reads like your mock in both light/dark.
 */
function NebulaBackground() {
  const scheme = useColorScheme();
  const seedStars = useMemo(() => makeStars(70), []);
  const dark = scheme === "dark";

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* base wash */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: dark ? "#140A1E" : "#F6F1FF" },
        ]}
      />

      {/* nebula blobs */}
      <View
        style={[
          styles.blob,
          {
            top: -140,
            right: -160,
            backgroundColor: dark ? "rgba(170,110,255,0.22)" : "rgba(155,110,255,0.18)",
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            bottom: -180,
            left: -180,
            backgroundColor: dark ? "rgba(255,160,220,0.16)" : "rgba(255,160,220,0.14)",
          },
        ]}
      />
      <View
        style={[
          styles.blobSmall,
          {
            top: 220,
            left: -120,
            backgroundColor: dark ? "rgba(160,220,255,0.10)" : "rgba(160,220,255,0.10)",
          },
        ]}
      />

      {/* stars */}
      {seedStars.map((s) => (
        <View
          key={s.key}
          style={[
            styles.star,
            {
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              opacity: dark ? s.opacity : s.opacity * 0.7,
              backgroundColor: dark ? "rgba(255,255,255,1)" : "rgba(90,60,140,1)",
            },
          ]}
        />
      ))}

      {/* subtle vignette */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: dark
              ? "rgba(0,0,0,0.10)"
              : "rgba(255,255,255,0.18)",
          },
        ]}
      />
    </View>
  );
}

function makeStars(count: number) {
  // deterministic pseudo-random so it doesn't reshuffle on rerenders
  let t = 123456;
  const rand = () => {
    t = (t * 1664525 + 1013904223) % 4294967296;
    return t / 4294967296;
  };

  const stars = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * 420);
    const y = Math.floor(rand() * 900);
    const size = 1 + Math.floor(rand() * 2); // 1–2
    const opacity = 0.25 + rand() * 0.55;
    stars.push({ key: `s-${i}`, x, y, size, opacity });
  }
  return stars;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  blob: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 999,
    transform: [{ scaleX: 1.1 }],
  },
  blobSmall: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 999,
    transform: [{ scaleX: 1.1 }],
  },
  star: {
    position: "absolute",
    borderRadius: 99,
  },
});
