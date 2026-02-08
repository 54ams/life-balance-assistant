// app/audit.tsx
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getAuditSnapshot, type AuditSnapshot } from "../lib/audit";

export default function AuditScreen() {
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
      <Text style={styles.title}>Diagnostics</Text>
      <Text style={styles.subtitle}>Quick sanity-check of stored logic + data.</Text>

      {!!err && (
        <View style={styles.card}>
          <Text style={styles.bad}>Error</Text>
          <Text style={styles.body}>{err}</Text>
        </View>
      )}

      {!snap ? (
        <Text style={styles.body}>Loading…</Text>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.h2}>Counts</Text>
            <Text style={styles.body}>Check-ins: {snap.counts.checkIns}</Text>
            <Text style={styles.body}>Results (LBI): {snap.counts.results}</Text>
            <Text style={styles.body}>Plans: {snap.counts.plans}</Text>
            <Text style={styles.body}>Wearables: {snap.counts.wearables}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>Latest saved</Text>
            <Text style={styles.body}>Check-in: {snap.latest.checkInDate ?? "—"}</Text>
            <Text style={styles.body}>Result: {snap.latest.resultDate ?? "—"}</Text>
            <Text style={styles.body}>Plan: {snap.latest.planDate ?? "—"}</Text>
            <Text style={styles.body}>Wearable: {snap.latest.wearableDate ?? "—"}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>Latest samples</Text>

            <Text style={styles.h3}>Check-in</Text>
            <Text selectable style={styles.mono}>
              {JSON.stringify(snap.sample.latestCheckIn ?? null, null, 2)}
            </Text>

            <Text style={styles.h3}>Result</Text>
            <Text selectable style={styles.mono}>
              {JSON.stringify(snap.sample.latestResult ?? null, null, 2)}
            </Text>

            <Text style={styles.h3}>Plan</Text>
            <Text selectable style={styles.mono}>
              {JSON.stringify(snap.sample.latestPlan ?? null, null, 2)}
            </Text>

            <Text style={styles.h3}>Wearable</Text>
            <Text selectable style={styles.mono}>
              {JSON.stringify(snap.sample.latestWearable ?? null, null, 2)}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>Notes</Text>
            <Text style={styles.body}>
              If any counts are 0, it means that part of the logic isn’t being saved (or your storage
              prefixes differ). If your keys don’t match “checkin: / result: / plan: / wearable:”, tell
              me what your storage keys look like and I’ll adjust the audit reader.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 24 },
  title: { fontSize: 26, fontWeight: "800", color: "#f8fafc" },
  subtitle: { marginTop: 6, color: "#94a3b8", marginBottom: 16 },

  card: { backgroundColor: "#020617", padding: 16, borderRadius: 14, marginBottom: 12 },
  h2: { color: "#e5e7eb", fontWeight: "800", marginBottom: 10, fontSize: 16 },
  h3: { color: "#94a3b8", fontWeight: "800", marginTop: 12, marginBottom: 6 },

  body: { color: "#e5e7eb", marginTop: 6, lineHeight: 20 },
  mono: {
    color: "#e5e7eb",
    fontFamily: "Menlo",
    fontSize: 12,
    lineHeight: 16,
    backgroundColor: "#0b1224",
    padding: 12,
    borderRadius: 12,
  },
  bad: { color: "#fca5a5", fontWeight: "800", marginBottom: 6 },
});
