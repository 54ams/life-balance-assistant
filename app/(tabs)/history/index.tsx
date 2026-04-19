import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { TAB_ORDER } from "@/constants/navigation";
import { useColorScheme } from "react-native";
import { loadPlan, type StoredPlan } from "@/lib/storage";
import { formatDateFriendly } from "@/lib/util/formatDate";
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
  return cat === "RECOVERY" ? "Recovery" : "Normal";
}

function formatDate(iso: string) {
  return formatDateFriendly(iso);
}

export default function HistoryScreen() {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? Colors.dark : Colors.light;

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
      return () => { alive = false; };
    }, [])
  );

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll>
        <Text style={[styles.title, { color: c.text.primary }]}>History</Text>
        <Text style={[styles.subtitle, { color: c.text.secondary }]}>
          Your last 7 days of plans and outcomes.
        </Text>

        {missingCount > 0 && (
          <GlassCard style={{ marginTop: Spacing.sm }}>
            <Text style={{ color: c.text.secondary, fontSize: 13 }}>
              {missingCount} day{missingCount > 1 ? "s" : ""} without data. Complete check-ins to fill gaps.
            </Text>
          </GlassCard>
        )}

        {rows.length === 0 ? (
          <GlassCard style={{ marginTop: Spacing.md }}>
            <Text style={{ color: c.text.secondary, fontSize: 14 }}>
              No saved plans yet. Complete a check-in to get started.
            </Text>
          </GlassCard>
        ) : (
          <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
            {rows.map((r) => {
              const adherence = r.actions.length
                ? Math.round(((r.completedActions ?? []).filter(Boolean).length / r.actions.length) * 100)
                : 0;

              return (
                <Pressable
                  key={r.date}
                  onPress={() => router.push({ pathname: "/history/plan-details", params: { date: r.date } } as any)}
                  accessibilityLabel={`View ${r.date}`}
                  accessibilityRole="button"
                  style={({ pressed }) => [pressed && { opacity: 0.9 }]}
                >
                  <GlassCard>
                    <View style={styles.cardHeader}>
                      <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15 }}>
                        {formatDate(r.date)}
                      </Text>
                      <View style={[styles.categoryBadge, { backgroundColor: c.glass.secondary, borderColor: c.border.light }]}>
                        <Text style={{ color: c.text.primary, fontSize: 12, fontWeight: "700" }}>
                          {categoryLabel(r.category)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metricsRow}>
                      <MetricBlock label="LBI" value={String(r.lbi)} c={c} />
                      <MetricBlock label="Baseline" value={r.baseline !== null ? String(r.baseline) : "—"} c={c} />
                      <MetricBlock label="Adherence" value={`${adherence}%`} c={c} />
                    </View>

                    {r.triggers.length > 0 && (
                      <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 8 }} numberOfLines={2}>
                        {r.triggers.join(" · ")}
                      </Text>
                    )}
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        )}
      </Screen>
    </TabSwipe>
  );
}

function MetricBlock({ label, value, c }: { label: string; value: string; c: typeof Colors.light }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: c.text.secondary, fontSize: 11, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: c.text.primary, fontSize: 20, fontWeight: "800", marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.3 },
  subtitle: { marginTop: 4, fontSize: 14, marginBottom: 4 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  metricsRow: {
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,128,0.15)",
  },
});
