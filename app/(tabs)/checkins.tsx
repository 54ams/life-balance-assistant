import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EmptyState } from "@/components/ui/EmptyState";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { listDailyRecords } from "@/lib/storage";
import { mentalScore, physioScore } from "@/lib/bridge";
import { todayISO } from "@/lib/util/todayISO";
import type { DailyRecord } from "@/lib/types";
import { formatDateFriendly } from "@/lib/util/formatDate";

// Human-readable label for an ISO date. "Today" / "Yesterday" / weekday +
// day + month for anything further back. Keeps the history list scannable.
function labelFor(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yISO = yesterday.toISOString().slice(0, 10);
  if (iso === yISO) return "Yesterday";
  return formatDateFriendly(iso);
}

function regulationCopy(r: DailyRecord["emotion"]): string | null {
  if (!r) return null;
  switch (r.regulation) {
    case "handled":
      return "Handled";
    case "manageable":
      return "Manageable";
    case "overwhelmed":
      return "Overwhelmed";
    default:
      return null;
  }
}

/** Count consecutive days with a check-in ending at today. */
function computeStreak(sorted: DailyRecord[]): number {
  const today = todayISO();
  let streak = 0;
  const cursor = new Date(today + "T00:00:00");
  const dateSet = new Set(sorted.map((r) => r.date));
  for (let i = 0; i < 365; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    if (dateSet.has(iso as any)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function CheckInsTab() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [todayDone, setTodayDone] = useState(false);
  const [streak, setStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        // Last ~60 days of records, newest first.
        const all = await listDailyRecords(60);
        if (!alive) return;
        const withCheckIn = all
          .filter((r) => r.checkIn != null || r.emotion != null)
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        setRecords(withCheckIn);
        setTodayDone(withCheckIn.some((r) => r.date === todayISO()));
        setStreak(computeStreak(withCheckIn));
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const goNewCheckIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push("/checkin" as any);
  };

  return (
    <Screen scroll>
      {/* Eyebrow label (Rival-inspired all-caps Inter with tracking) */}
      <Text
        style={{
          color: c.text.tertiary,
          fontSize: Typography.fontSize.xs,
          fontFamily: Typography.fontFamily.bold,
          letterSpacing: Typography.letterSpacing.allcaps,
          fontWeight: "800",
        }}
      >
        YOUR PRACTICE
      </Text>

      {/* Serif display heading */}
      <Text
        style={{
          color: c.text.primary,
          fontSize: 38,
          fontFamily: Typography.fontFamily.serifItalic,
          letterSpacing: -0.3,
          marginTop: 4,
          lineHeight: 44,
        }}
      >
        Check-ins
      </Text>

      <Text
        style={{
          color: c.text.secondary,
          fontSize: 14,
          marginTop: 6,
          lineHeight: 20,
        }}
      >
        A short log of how today feels, and a quiet record of the days
        before it. The more often you check in, the more the app can
        notice alongside you.
      </Text>

      {/* Summary stats */}
      {records.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: Spacing.base,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
              borderWidth: 1,
              borderColor: c.border.light,
              borderRadius: BorderRadius.xl,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: c.accent.primary, fontSize: 28, fontWeight: "900" }}>
              {streak}
            </Text>
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1, marginTop: 2 }}>
              DAY STREAK
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
              borderWidth: 1,
              borderColor: c.border.light,
              borderRadius: BorderRadius.xl,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: c.accent.primary, fontSize: 28, fontWeight: "900" }}>
              {records.length}
            </Text>
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1, marginTop: 2 }}>
              TOTAL CHECK-INS
            </Text>
          </View>
        </View>
      )}

      {/* Primary CTA — new check-in for today, or a gentle "done" note. */}
      <View style={{ marginTop: Spacing.lg }}>
        {todayDone ? (
          <GlassCard>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={[
                  styles.iconChip,
                  { backgroundColor: c.lime + "28" },
                ]}
              >
                <IconSymbol
                  name="checkmark"
                  size={16}
                  color={c.accent.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: c.text.primary,
                    fontWeight: "800",
                    fontSize: 15,
                  }}
                >
                  Today's check-in is saved
                </Text>
                <Text
                  style={{ color: c.text.secondary, fontSize: 12, marginTop: 2 }}
                >
                  You can edit it anytime before the day is out.
                </Text>
              </View>
              <Pressable
                onPress={goNewCheckIn}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Edit today's check-in"
              >
                <Text
                  style={{
                    color: c.accent.primary,
                    fontWeight: "800",
                    fontSize: 13,
                  }}
                >
                  Edit
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        ) : (
          <Pressable
            onPress={goNewCheckIn}
            accessibilityRole="button"
            accessibilityLabel="Start a new check-in for today"
            style={({ pressed }) => [
              styles.ctaCard,
              {
                backgroundColor: c.accent.primary,
                borderColor: c.accent.primary,
              },
              pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: c.lime,
                  fontSize: Typography.fontSize.xs,
                  fontFamily: Typography.fontFamily.bold,
                  letterSpacing: Typography.letterSpacing.allcaps,
                  fontWeight: "800",
                }}
              >
                TAKE A MOMENT
              </Text>
              <Text
                style={{
                  color: c.text.inverse,
                  fontSize: 22,
                  fontFamily: Typography.fontFamily.serifItalic,
                  marginTop: 2,
                  lineHeight: 28,
                }}
              >
                Start today's check-in
              </Text>
              <Text
                style={{
                  color: c.text.inverse,
                  opacity: 0.72,
                  fontSize: 13,
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                Around a minute. No rigid scales — just where you are.
              </Text>
            </View>
            <View
              style={[
                styles.ctaIcon,
                { backgroundColor: c.lime },
              ]}
            >
              <IconSymbol
                name="arrow.right"
                size={18}
                color={c.accent.primary}
              />
            </View>
          </Pressable>
        )}
      </View>

      {/* History */}
      <View style={{ marginTop: Spacing.lg }}>
        <Text
          style={{
            color: c.text.tertiary,
            fontSize: Typography.fontSize.xs,
            fontFamily: Typography.fontFamily.bold,
            letterSpacing: Typography.letterSpacing.allcaps,
            fontWeight: "800",
            marginBottom: Spacing.sm,
          }}
        >
          HISTORY
        </Text>

        {records.length === 0 ? (
          <GlassCard>
            <EmptyState
              icon="square.and.pencil"
              title="No check-ins yet"
              description="Your first check-in will appear here. The app learns gently from each one — patterns need a handful of days before they mean anything."
              actionLabel="Start check-in"
              onAction={goNewCheckIn}
            />
          </GlassCard>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {records.map((r) => {
              const physio = physioScore(r);
              const mental = mentalScore(r);
              const gap = physio != null && mental != null ? Math.abs(physio - mental) : 0;
              const isDivergent = gap >= 25;
              const reg = regulationCopy(r.emotion);
              const note =
                r.emotion?.reflection?.trim() || r.checkIn?.notes?.trim() || "";
              const tags = r.emotion?.contextTags ?? [];

              return (
                <Pressable
                  key={r.date}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    router.push({
                      pathname: "/day/[date]",
                      params: { date: r.date },
                    } as any);
                  }}
                  style={({ pressed }) => [pressed && { opacity: 0.9 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open check-in for ${labelFor(r.date)}`}
                >
                  <GlassCard>
                    <View style={styles.rowHeader}>
                      <Text
                        style={{
                          color: c.text.primary,
                          fontWeight: "800",
                          fontSize: 15,
                        }}
                      >
                        {labelFor(r.date)}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        {isDivergent && (
                          <View
                            style={[
                              styles.regChip,
                              {
                                borderColor: c.warning + "40",
                                backgroundColor: c.warning + "14",
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: c.warning,
                                fontSize: 11,
                                fontWeight: "700",
                                letterSpacing: 0.4,
                              }}
                            >
                              Gap {gap}
                            </Text>
                          </View>
                        )}
                        {reg ? (
                          <View
                            style={[
                              styles.regChip,
                              {
                                borderColor: c.border.light,
                                backgroundColor: isDark
                                  ? "rgba(255,255,255,0.04)"
                                  : "rgba(255,255,255,0.55)",
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: c.text.secondary,
                                fontSize: 11,
                                fontWeight: "700",
                                letterSpacing: 0.4,
                              }}
                            >
                              {reg}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Mind/Body mini bars */}
                    <View style={{ marginTop: 10, gap: 6 }}>
                      <MiniBar label="Body" value={physio} c={c} />
                      <MiniBar label="Mind" value={mental} c={c} />
                    </View>

                    {tags.length > 0 ? (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 6,
                          marginTop: 10,
                        }}
                      >
                        {tags.slice(0, 4).map((t) => (
                          <View
                            key={t}
                            style={[
                              styles.tagChip,
                              { borderColor: c.border.light },
                            ]}
                          >
                            <Text
                              style={{
                                color: c.text.secondary,
                                fontSize: 11,
                                fontWeight: "600",
                              }}
                            >
                              {t}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {note ? (
                      <Text
                        numberOfLines={2}
                        style={{
                          color: c.text.secondary,
                          fontSize: 13,
                          marginTop: 10,
                          lineHeight: 18,
                          fontStyle: "italic",
                          fontFamily: Typography.fontFamily.serifItalic,
                        }}
                      >
                        "{note}"
                      </Text>
                    ) : null}
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Footer – research-calibrated reassurance */}
      <View style={{ marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
        <Text
          style={{
            color: c.text.tertiary,
            fontSize: 11,
            textAlign: "center",
            lineHeight: 16,
          }}
        >
          Stored on your device. Shared with the model only if you ask
          for a deeper read, and scrubbed of anything identifying before
          it leaves.
        </Text>
      </View>
    </Screen>
  );
}

function MiniBar({
  label,
  value,
  c,
}: {
  label: string;
  value: number | null;
  c: typeof Colors.light;
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text
        style={{
          color: c.text.tertiary,
          fontSize: 10,
          fontWeight: "800",
          width: 34,
          letterSpacing: 1.2,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <View
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          backgroundColor: "rgba(44, 54, 42, 0.08)",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor:
              value == null ? c.text.tertiary : c.accent.primary,
            opacity: value == null ? 0.3 : 1,
          }}
        />
      </View>
      <Text
        style={{
          color: c.text.secondary,
          fontSize: 11,
          fontWeight: "700",
          width: 28,
          textAlign: "right",
        }}
      >
        {value == null ? "—" : Math.round(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 20,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  regChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tagChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
});
