import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { loadPlan, type StoredPlan } from "@/lib/storage";
import { TabSwipe } from "@/components/TabSwipe";

const TAB_ORDER = ["/", "/checkin", "/insights", "/history", "/profile"] as const;

function lastNDates(n: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function categoryLabel(cat: StoredPlan["category"]) {
  return cat === "RECOVERY" ? "Recovery day" : "Normal day";
}

export default function HistoryScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme ?? "light"];

  const dates = useMemo(() => lastNDates(7), []);
  const [rows, setRows] = useState<StoredPlan[]>([]);
  const [missingCount, setMissingCount] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        const plans: StoredPlan[] = [];
        let missing = 0;

        for (const date of dates) {
          const p = await loadPlan(date);
          if (p) plans.push(p);
          else missing += 1;
        }

        if (!alive) return;

        plans.sort((a, b) => (a.date < b.date ? 1 : -1));
        setRows(plans);
        setMissingCount(missing);
      })();

      return () => {
        alive = false;
      };
    }, [dates])
  );

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll>
      <Text style={[styles.title, { color: C.text }]}>History (7 days)</Text>
      <Text style={[styles.subtitle, { color: C.muted }]}>Saved daily outputs and triggers.</Text>

      {missingCount > 0 && (
        <GlassCard style={styles.note}>
          <Text style={[styles.noteText, { color: C.muted }]}>Missing days: {missingCount}. Open Home to generate plans.</Text>
        </GlassCard>
      )}

      {rows.length === 0 ? (
        <GlassCard>
          <Text style={[styles.empty, { color: C.muted }]}>No saved plans yet — open Home for a few days.</Text>
        </GlassCard>
      ) : (
        <View style={{ gap: 12 }}>
          {rows.map((r) => (
            <Pressable
              key={r.date}
              onPress={() =>
                router.push({ pathname: "/history/plan-details", params: { date: r.date } } as any)
              }
              style={({ pressed }) => [pressed && { opacity: 0.9 }]}
            >
              <GlassCard>
                <Text style={[styles.date, { color: C.muted }]}>{r.date}</Text>

                <View style={styles.rowLine}>
                  <Text style={[styles.metric, { color: C.text }]}>LBI</Text>
                  <Text style={[styles.metricValue, { color: C.text }]}>{r.lbi}</Text>
                </View>

                <View style={styles.rowLine}>
                  <Text style={[styles.metric, { color: C.muted }]}>Baseline</Text>
                  <Text style={[styles.metricValue, { color: C.muted }]}>
                    {r.baseline !== null ? r.baseline : "—"}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { borderColor: C.border, backgroundColor: C.card }]}>
                    <Text style={[styles.badgeText, { color: C.text }]}>{categoryLabel(r.category)}</Text>
                  </View>
                </View>

                {r.triggers.length > 0 && (
                  <Text style={[styles.triggers, { color: C.muted }]} numberOfLines={3}>
                    Triggers: {r.triggers.join(" • ")}
                  </Text>
                )}
              </GlassCard>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
    </TabSwipe>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  subtitle: { marginTop: 6, marginBottom: 16, fontSize: 14 },

  note: { marginBottom: 12 },
  noteText: { fontSize: 13 },

  empty: { fontSize: 14 },

  date: { fontSize: 12, marginBottom: 10 },
  rowLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  metric: { fontSize: 13, fontWeight: "700" },
  metricValue: { fontSize: 13, fontWeight: "800" },

  badgeRow: { marginTop: 6, marginBottom: 6, flexDirection: "row" },
  badge: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: "800" },

  triggers: { marginTop: 4, fontSize: 12, lineHeight: 16 },
});