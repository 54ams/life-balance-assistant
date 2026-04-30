import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { BorderRadius } from "@/constants/Spacing";
import { getAppConsent } from "@/lib/privacy";

export default function InsightsLayout() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [ready, setReady] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  // Re-check consent every time the Insights tab regains focus, so a user who
  // grants consent (or refreshes the browser) sees insights without needing
  // to fully reload the app. Avoids the "you must consent" page sticking
  // after consent has actually been recorded.
  const refresh = useCallback(async () => {
    const consent = await getAppConsent();
    setHasConsent(!!consent);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!ready) return null;

  if (!hasConsent) {
    return (
      <Screen scroll contentStyle={{ paddingTop: 24 }}>
        <Text style={[styles.h1, { color: c.text.primary }]}>Insights</Text>
        <Text style={[styles.sub, { color: c.text.secondary }]}>
          A bit more setup is needed before insights can be shown.
        </Text>

        <GlassCard style={styles.card}>
          <Text style={[styles.title, { color: c.text.primary }]}>Consent required</Text>
          <Text style={[styles.body, { color: c.text.secondary }]}>
            Insights use the data you've logged on this device. Because that
            includes wellbeing information, we ask for explicit consent before
            showing patterns and correlations.
          </Text>
          <Text style={[styles.body, { color: c.text.secondary }]}>
            Open the consent screen to review and confirm — it only takes a
            moment, and your choices stay on this device.
          </Text>

          <Pressable
            onPress={() => router.push("/profile/settings/consent" as any)}
            style={[styles.btn, { backgroundColor: c.accent.primary }]}
          >
            <Text style={[styles.btnText, { color: c.onPrimary }]}>Review & confirm consent</Text>
          </Pressable>
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: "ios_from_right",
      }}
    />
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: "800" },
  sub: { marginTop: 6, marginBottom: 14 },
  card: { padding: 18, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800" },
  body: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  btn: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  btnText: { fontSize: 14, fontWeight: "800" },
});
