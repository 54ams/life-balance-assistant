import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { getDay } from "@/lib/storage";
import { todayISO } from "@/lib/util/todayISO";
import { mentalScore, physioScore } from "@/lib/bridge";

/**
 * Post-check-in micro-moment: a physiological dot and a mental dot start
 * apart, then glide toward each other while the label explains what the
 * bridge means. After ~2s we auto-return to Home.
 */
export default function CheckInSavedScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const physioColor = isDark ? "#57D6A4" : "#2FA37A";
  const mentalColor = isDark ? "#8B7FE8" : "#6B5DD3";

  const [values, setValues] = useState<{ physio: number | null; mental: number | null }>({
    physio: null,
    mental: null,
  });

  const physioX = useRef(new Animated.Value(-120)).current;
  const mentalX = useRef(new Animated.Value(120)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    (async () => {
      const day = await getDay(todayISO());
      setValues({ physio: day ? physioScore(day) : null, mental: day ? mentalScore(day) : null });
    })();
  }, []);

  useEffect(() => {
    // Phase 1: fade in + glide dots toward centre with a soft easing.
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(physioX, {
          toValue: -18,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(mentalX, {
          toValue: 18,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Phase 2: gentle pulse where the dots meet.
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.9,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 },
      ),
    ]).start();

    // Auto-return home after the full animation window.
    const t = setTimeout(() => {
      router.replace({ pathname: "/", params: { refresh: "1" } } as any);
    }, 2800);
    return () => clearTimeout(t);
  }, [fadeAnim, physioX, mentalX, pulseAnim]);

  const gapLabel = (() => {
    if (values.physio == null || values.mental == null) return "Thanks — your check-in is saved.";
    const gap = Math.abs(values.physio - values.mental);
    if (gap <= 10) return "Your body and mind are in step today.";
    if (values.physio > values.mental) return "Your body feels ahead of your mind. Gentle pace.";
    return "Your mind is ahead of your body. Let recovery catch up.";
  })();

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.base }}>
          <Text style={{ color: c.text.secondary, fontSize: 13, fontWeight: "700", letterSpacing: 0.3 }}>
            CHECK-IN SAVED
          </Text>
          <Text style={{ color: c.text.primary, fontSize: 24, fontWeight: "800", marginTop: 6, textAlign: "center" }}>
            The bridge
          </Text>

          {/* Dots track */}
          <View style={{ height: 140, width: "100%", marginTop: 24, alignItems: "center", justifyContent: "center" }}>
            <Animated.View
              style={{
                position: "absolute",
                transform: [{ translateX: physioX }, { scale: pulseAnim }],
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: physioColor + "22",
                  borderWidth: 3,
                  borderColor: physioColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "800" }}>
                  {values.physio ?? "—"}
                </Text>
              </View>
              <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "700", marginTop: 6 }}>
                Body
              </Text>
            </Animated.View>

            <Animated.View
              style={{
                position: "absolute",
                transform: [{ translateX: mentalX }, { scale: pulseAnim }],
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: mentalColor + "22",
                  borderWidth: 3,
                  borderColor: mentalColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "800" }}>
                  {values.mental ?? "—"}
                </Text>
              </View>
              <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "700", marginTop: 6 }}>
                Mind
              </Text>
            </Animated.View>
          </View>

          <Text style={{ color: c.text.secondary, fontSize: 14, lineHeight: 20, marginTop: 24, textAlign: "center", maxWidth: 300 }}>
            {gapLabel}
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
