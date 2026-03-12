// app/audit.tsx
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { getAuditSnapshot, type AuditSnapshot } from "../lib/audit";
import { GlassCard } from "@/components/ui/GlassCard";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";

export default function AuditScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [snap, setSnap] = useState<AuditSnapshot | null>(null);
  const [err, setErr] = useState<string>("");

  const refresh = useCallback(() => {
    let alive = true;

    (async () => {
      try {
        setErr("");
        const s = await getAuditSnapshot();
        if (!alive) return;
        setSnap(s);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load audit snapshot");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useFocusEffect(refresh);

  return (
    <Screen scroll padded={false} decorated={false}>
      <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 24 }}>
        <Text style={[styles.title, { color: c.text.primary }]}>Diagnostics</Text>
        <Text style={[styles.subtitle, { color: c.text.secondary }]}>Quick sanity-check of stored logic + data.</Text>

      {!!err && (
        <View style={[styles.card, { backgroundColor: c.glass.primary, borderColor: c.border.medium }] }>
          <Text style={[styles.bad, { color: c.danger }]}>Error</Text>
          <Text style={[styles.body, { color: c.text.primary }]}>{err}</Text>
        </View>
      )}

      {!snap ? (
        <Text style={[styles.body, { color: c.text.primary }]}>Loading…</Text>
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: c.glass.primary, borderColor: c.border.medium }] }>
            <Text style={[styles.h2, { color: c.text.primary }]}>Counts</Text>
            <Text style={[styles.body, { color: c.text.primary }]}>Check-ins: {snap.counts.checkIns}</Text>
            <Text style={[styles.body, { color: c.text.primary }]}>Results (LBI): {snap.counts.results}</Text>
            <Text style={[styles.body, { color: c.text.primary }]}>Plans: {snap.counts.plans}</Text>
            <Text style={[styles.body, { color: c.text.primary }]}>Wearables: {snap.counts.wearables}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.glass.primary, borderColor: c.border.medium }] }>
            <Text style={[styles.h2, { color: c.text.primary }]}>Latest saved</Text>
            <Text style={[styles.body, { color: c.text.primary }]}>Check-in: {snap.latest.checkInDate ?? "—"}</Text>
            <Text style={[styles.body, { color: c.text.primary }]}>Result: {snap.latest.resultDate ?? "—"}</Text>
            <Text style={[styles.body, { color: c.text.primary }]}>Plan: {snap.latest.planDate ?? "—"}</Text>
            <Text style={[styles.body, { color: c.text.primary }]}>Wearable: {snap.latest.wearableDate ?? "—"}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.glass.primary, borderColor: c.border.medium }] }>
            <Text style={[styles.h2, { color: c.text.primary }]}>Latest samples</Text>

            <Text style={[styles.h3, { color: c.text.secondary }]}>Check-in</Text>
            <Text selectable style={[styles.mono, { color: c.text.primary, backgroundColor: c.background, borderColor: c.border.medium }]}>
              {JSON.stringify(snap.sample.latestCheckIn ?? null, null, 2)}
            </Text>

            <Text style={[styles.h3, { color: c.text.secondary }]}>Result</Text>
            <Text selectable style={[styles.mono, { color: c.text.primary, backgroundColor: c.background, borderColor: c.border.medium }]}>
              {JSON.stringify(snap.sample.latestResult ?? null, null, 2)}
            </Text>

            <Text style={[styles.h3, { color: c.text.secondary }]}>Plan</Text>
            <Text selectable style={[styles.mono, { color: c.text.primary, backgroundColor: c.background, borderColor: c.border.medium }]}>
              {JSON.stringify(snap.sample.latestPlan ?? null, null, 2)}
            </Text>

            <Text style={[styles.h3, { color: c.text.secondary }]}>Wearable</Text>
            <Text selectable style={[styles.mono, { color: c.text.primary, backgroundColor: c.background, borderColor: c.border.medium }]}>
              {JSON.stringify(snap.sample.latestWearable ?? null, null, 2)}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.glass.primary, borderColor: c.border.medium }] }>
            <Text style={[styles.h2, { color: c.text.primary }]}>Notes</Text>
            <Text style={[styles.body, { color: c.text.primary }]}>
              If any counts are 0, it means that part of the logic isn’t being saved (or your storage
              prefixes differ). If your keys don’t match “checkin: / result: / plan: / wearable:”, tell
              me what your storage keys look like and I’ll adjust the audit reader.
            </Text>
          </View>
        </>
      )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { marginTop: 6, marginBottom: 16 },

  card: { padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1 },
  h2: { fontWeight: "800", marginBottom: 10, fontSize: 16 },
  h3: { fontWeight: "800", marginTop: 12, marginBottom: 6 },

  body: { marginTop: 6, lineHeight: 20 },
  mono: {
    fontFamily: "Menlo",
    fontSize: 12,
    lineHeight: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bad: { fontWeight: "800", marginBottom: 6 },
});
