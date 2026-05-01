// app/(tabs)/profile/index.tsx
//
// Profile / "Me" tab — the hub for tools, settings, and integrations.
//
// I designed this as a single index screen so anything not on the
// front three tabs (habits, sleep hygiene, reframe, weekly reflection,
// behaviour cycles, wearables, GP export, calendar, history,
// schedule, data export) is one tap from here.
//
// The settings group is intentionally short — most actual toggles
// live in /profile/settings/* — so the index does not become a
// dumping ground.
import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { TAB_ORDER } from "@/constants/navigation";
import { useColorScheme } from "react-native";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { TabSwipe } from "@/components/TabSwipe";
import { getUserName, getActiveValues, getLifeContexts, listDailyRecords } from "@/lib/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ONBOARDING_GATE_KEYS } from "@/lib/storageKeys";
import { confirmDestructive } from "@/lib/util/confirm";
import * as Haptics from "expo-haptics";

const TOOLS: Array<{ title: string; subtitle: string; icon: any; route: string }> = [
  { title: "Habits", subtitle: "IF/THEN habits with streaks", icon: "repeat", route: "/checkin/habits" },
  { title: "Sleep Hygiene", subtitle: "Evening wind-down checklist", icon: "moon.fill", route: "/checkin/sleep-hygiene" },
  { title: "Thought Reframing", subtitle: "Challenge unhelpful thoughts (CBT)", icon: "lightbulb.fill", route: "/checkin/reframe" },
  { title: "Weekly Reflection", subtitle: "Review wins, lessons, and intentions", icon: "text.book.closed.fill", route: "/insights/weekly-reflection" },
  { title: "Behaviour Cycles", subtitle: "See how actions and mood connect", icon: "arrow.triangle.2.circlepath", route: "/insights/cycles" },
  { title: "Wearables", subtitle: "Connect devices and manage data", icon: "heart.fill", route: "/profile/integrations" },
  { title: "Show Your GP", subtitle: "Export a 4-week appointment summary", icon: "cross.case.fill", route: "/profile/gp-export" },
  { title: "Calendar", subtitle: "Review past and future days", icon: "calendar", route: "/calendar" },
  { title: "History", subtitle: "Plans, adherence, and outcomes", icon: "clock.fill", route: "/history" },
  { title: "My Schedule", subtitle: "Recurring commitments and routines", icon: "calendar.badge.clock", route: "/profile/settings/schedule" },
  { title: "Export Data", subtitle: "Download your data for research", icon: "square.and.arrow.up", route: "/profile/export" },
];

const SETTINGS: Array<{ title: string; subtitle: string; icon: any; route: string }> = [
  { title: "Settings", subtitle: "Notifications, theme, demo mode", icon: "gearshape.fill", route: "/profile/settings" },
];

export default function ProfileScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [name, setName] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [contexts, setContexts] = useState<string[]>([]);
  const [totalDays, setTotalDays] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [n, v, ctx, records] = await Promise.all([
          getUserName(),
          getActiveValues(),
          getLifeContexts(),
          listDailyRecords(365),
        ]);
        if (!alive) return;
        setName(n);
        setValues(v);
        setContexts(ctx);
        setTotalDays(records.filter((r) => r.checkIn != null || r.emotion != null).length);
      })();
      return () => { alive = false; };
    }, []),
  );

  const replayWelcome = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const ok = await confirmDestructive(
      "Replay welcome?",
      "This clears your onboarding progress and shows the first-launch flow again. Your check-ins and data stay intact.",
      "Replay",
    );
    if (!ok) return;
    // Clear every onboarding gate (welcome, consent, first-run, tour v1+v2)
    // so the full first-time flow replays: Welcome → Onboarding → First-run
    // → App Tour → Home. Keys come from the central storageKeys catalog so
    // a renamed key never silently leaves a gate set.
    await AsyncStorage.multiRemove([...ONBOARDING_GATE_KEYS]);
    router.replace("/welcome" as any);
  };

  const renderRow = (item: typeof TOOLS[0]) => (
    <Pressable
      key={item.route}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        router.push(item.route as any);
      }}
      accessibilityLabel={item.title}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingVertical: 14,
          paddingHorizontal: 4,
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: c.glass.secondary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconSymbol name={item.icon} size={17} color={c.text.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text.primary, fontSize: 15, fontWeight: "700" }}>{item.title}</Text>
        <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 1 }}>{item.subtitle}</Text>
      </View>
      <IconSymbol name="chevron.right" size={12} color={c.text.tertiary} />
    </Pressable>
  );

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll>
        {/* Eyebrow */}
        <Text
          style={{
            color: c.text.tertiary,
            fontSize: Typography.fontSize.xs,
            fontFamily: Typography.fontFamily.bold,
            letterSpacing: Typography.letterSpacing.allcaps,
            fontWeight: "800",
          }}
        >
          YOU
        </Text>

        {/* Serif heading */}
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
          Profile
        </Text>

        {/* Identity card */}
        <GlassCard style={{ marginTop: Spacing.lg }} padding="lg">
          {/* Edit button */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              router.push("/profile/settings/edit-profile" as any);
            }}
            accessibilityLabel="Edit profile"
            accessibilityRole="button"
            style={({ pressed }) => [
              {
                position: "absolute",
                top: 14,
                right: 14,
                zIndex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingVertical: 4,
                paddingHorizontal: 8,
              },
              pressed && { opacity: 0.5 },
            ]}
          >
            <IconSymbol name="pencil" size={13} color={c.text.tertiary} />
            <Text style={{ color: c.text.tertiary, fontSize: 12, fontWeight: "600" }}>Edit</Text>
          </Pressable>

          <View style={{ alignItems: "center" }}>
            {/* Avatar circle with initial */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: c.accent.primary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: c.lime, fontSize: 26, fontWeight: "900" }}>
                {name ? name.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>

            <Text
              style={{
                color: c.text.primary,
                fontSize: 22,
                fontFamily: Typography.fontFamily.serifItalic,
                textAlign: "center",
              }}
            >
              {name || "No name set"}
            </Text>

            {totalDays > 0 && (
              <Text style={{ color: c.text.tertiary, fontSize: 12, fontWeight: "700", marginTop: 4 }}>
                {totalDays} check-in{totalDays !== 1 ? "s" : ""} logged
              </Text>
            )}
          </View>

          {/* Values */}
          {values.length > 0 && (
            <View style={{ marginTop: Spacing.base }}>
              <Text
                style={{
                  color: c.text.tertiary,
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 1.2,
                  marginBottom: 8,
                }}
              >
                YOUR VALUES
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {values.map((v) => (
                  <View
                    key={v}
                    style={{
                      paddingVertical: 5,
                      paddingHorizontal: 12,
                      borderRadius: BorderRadius.full,
                      backgroundColor: c.accent.primary + "14",
                      borderWidth: 1,
                      borderColor: c.accent.primary + "30",
                    }}
                  >
                    <Text style={{ color: c.accent.primary, fontSize: 12, fontWeight: "700" }}>
                      {v}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Life contexts */}
          {contexts.length > 0 && (
            <View style={{ marginTop: Spacing.sm }}>
              <Text
                style={{
                  color: c.text.tertiary,
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 1.2,
                  marginBottom: 8,
                }}
              >
                LIFE CONTEXTS
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {contexts.map((ctx) => (
                  <View
                    key={ctx}
                    style={{
                      paddingVertical: 5,
                      paddingHorizontal: 12,
                      borderRadius: BorderRadius.full,
                      borderWidth: 1,
                      borderColor: c.border.light,
                      backgroundColor: "rgba(255,255,255,0.55)",
                    }}
                  >
                    <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "600" }}>
                      {ctx}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </GlassCard>

        {/* Data & Tools */}
        <View style={{ marginTop: Spacing.lg }}>
          <Text
            style={{
              color: c.text.tertiary,
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 1.2,
              marginBottom: Spacing.xs,
            }}
          >
            DATA & TOOLS
          </Text>
          <GlassCard padding="base">
            {TOOLS.map((item, i) => (
              <React.Fragment key={item.route}>
                {i > 0 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: "rgba(0,0,0,0.03)",
                    }}
                  />
                )}
                {renderRow(item)}
              </React.Fragment>
            ))}
          </GlassCard>
        </View>

        {/* Settings */}
        <View style={{ marginTop: Spacing.md }}>
          <Text
            style={{
              color: c.text.tertiary,
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 1.2,
              marginBottom: Spacing.xs,
            }}
          >
            SETTINGS
          </Text>
          <GlassCard padding="base">
            {SETTINGS.map((item) => renderRow(item))}

            <View
              style={{
                height: 1,
                backgroundColor: "rgba(0,0,0,0.03)",
              }}
            />

            {/* Replay welcome */}
            <Pressable
              onPress={replayWelcome}
              accessibilityLabel="Replay welcome screen"
              accessibilityRole="button"
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 4,
                },
                pressed && { opacity: 0.6 },
              ]}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: c.glass.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconSymbol name="arrow.counterclockwise" size={17} color={c.text.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text.primary, fontSize: 15, fontWeight: "700" }}>
                  Replay welcome
                </Text>
                <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 1 }}>
                  See the first-launch experience again
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={12} color={c.text.tertiary} />
            </Pressable>
          </GlassCard>
        </View>

        {/* Footer */}
        <Text
          style={{
            color: c.text.tertiary,
            fontSize: 11,
            textAlign: "center",
            marginTop: Spacing.lg,
            marginBottom: Spacing.sm,
            lineHeight: 16,
          }}
        >
          Life Balance Assistant · v1.0.0{"\n"}All data stays on your device
        </Text>
      </Screen>
    </TabSwipe>
  );
}
