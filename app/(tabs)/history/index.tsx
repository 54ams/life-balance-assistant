import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { TAB_ORDER } from "@/constants/navigation";
import { useColorScheme } from "react-native";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { loadPlan, type StoredPlan } from "@/lib/storage";
import { TabSwipe } from "@/components/TabSwipe";

function lastNDates(n: number) {
  const out: string[] = [];
  const d = new Date();
  const toISO = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  for (let i = 0; i < n; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(toISO(x));
  }
  return out;
}

function categoryLabel(cat: StoredPlan["category"]) {
  return cat === "RECOVERY" ? "Recovery day" : "Normal day";
}

export default function HistoryScreen() {
  const scheme = useColorScheme();
  const C = scheme === "dark" ? Colors.dark : Colors.light;

  const [rows, setRows] = useState<StoredPlan[]>([]);
  const [missingCount, setMissingCount] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        const dates = lastNDates(7);
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
    }, [])
  );

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll>
      <Text style={[styles.title, { color: C.text.primary }]}>History (7 days)</Text>
      <Text style={[styles.subtitle, { color: C.text.secondary }]}>Saved daily outputs and triggers.</Text>

      {missingCount > 0 && (
        <GlassCard style={styles.note}>
          <Text style={[styles.noteText, { color: C.text.secondary }]}>
            Missing days: {missingCount}. Open Home to generate plans.
          </Text>
        </GlassCard>
      )}

      {rows.length === 0 ? (
        <GlassCard>
          <Text style={[styles.empty, { color: C.text.secondary }]}>
            No saved plans yet — open Home for a few days.
          </Text>
        </GlassCard>
      ) : (
        <View style={{ gap: 12 }}>
          {rows.map((r) => (
            <Pressable
              key={r.date}
              onPress={() =>
                router.push({ pathname: "/day/[date]", params: { date: r.date } } as any)
              }
              accessibilityLabel={`Open day details for ${r.date}`}
              accessibilityRole="button"
              style={({ pressed }) => [pressed && { opacity: 0.9 }]}
            >
              <GlassCard>
                <Text style={[styles.date, { color: C.text.secondary }]}>{r.date}</Text>

                <View style={styles.rowLine}>
                  <Text style={[styles.metric, { color: C.text.primary }]}>LBI</Text>
                  <Text style={[styles.metricValue, { color: C.text.primary }]}>{r.lbi}</Text>
                </View>

                <View style={styles.rowLine}>
                  <Text style={[styles.metric, { color: C.text.secondary }]}>Baseline</Text>
                  <Text style={[styles.metricValue, { color: C.text.secondary }]}>
                    {r.baseline !== null ? r.baseline : "—"}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.badge,
                      { borderColor: C.border.medium, backgroundColor: C.glass.primary },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: C.text.primary }]}>
                      {categoryLabel(r.category)}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.triggers, { color: C.text.secondary }]}>
                  Adherence: {r.actions.length ? Math.round((((r.completedActions ?? []).filter(Boolean).length / r.actions.length) * 100)) : 0}%
                </Text>

                {r.triggers.length > 0 && (
                  <Text style={[styles.triggers, { color: C.text.secondary }]} numberOfLines={3}>
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
