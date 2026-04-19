import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { useColorScheme } from "react-native";

type SettingsItem = { title: string; subtitle: string; icon: string; route: string };

const YOUR_APP: SettingsItem[] = [
  { title: "Edit profile", subtitle: "Name, values, goals, and preferences", icon: "person.fill", route: "/profile/settings/edit-profile" },
  { title: "Reminders", subtitle: "A gentle nudge for your daily check-in", icon: "bell.fill", route: "/profile/settings/notifications" },
  { title: "Reflection tone", subtitle: "Gentle, direct, or a bit playful", icon: "text.quote", route: "/profile/settings/reflection" },
  { title: "What matters to you", subtitle: "Pick the values that guide your week", icon: "heart.fill", route: "/profile/settings/values" },
];

const YOUR_DATA: SettingsItem[] = [
  { title: "Your data", subtitle: "What's stored and for how long", icon: "externaldrive.fill", route: "/profile/settings/data" },
  { title: "Privacy notice", subtitle: "Plain-English summary of what we store", icon: "lock.fill", route: "/profile/settings/privacy" },
  { title: "Consent & choices", subtitle: "What you agreed to, and how to change it", icon: "checkmark.shield.fill", route: "/profile/settings/consent" },
  { title: "WHOOP permission", subtitle: "Manage wearable data access", icon: "antenna.radiowaves.left.and.right", route: "/profile/settings/consent-whoop" },
  { title: "Connect WHOOP", subtitle: "Sign in and sync your wearable", icon: "heart.text.square", route: "/profile/integrations/whoop" },
];

const SUPPORT: SettingsItem[] = [
  { title: "If you need support", subtitle: "Quick-dial numbers and UK services", icon: "phone.fill", route: "/profile/settings/help" },
  { title: "How the score is built", subtitle: "Peek under the hood of the balance score", icon: "function", route: "/profile/settings/model" },
  { title: "Share feedback", subtitle: "A short survey about how the app felt", icon: "bubble.left.fill", route: "/profile/settings/usability" },
  { title: "Wrapping up", subtitle: "Share feedback and take a copy of your data", icon: "doc.text.fill", route: "/profile/settings/study" },
  { title: "About & methodology", subtitle: "Theory, credits, and what this app isn't", icon: "info.circle.fill", route: "/profile/settings/about" },
];

const DEV: SettingsItem[] = [
  { title: "Demo tools", subtitle: "Load example data to explore the app", icon: "play.fill", route: "/profile/settings/demo" },
  { title: "Under the bonnet", subtitle: "Everything stored on this device", icon: "wrench.fill", route: "/audit" },
];

function SettingsGroup({
  label,
  items,
  c,
  isDark,
}: {
  label: string;
  items: SettingsItem[];
  c: typeof Colors.light;
  isDark: boolean;
}) {
  return (
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
        {label}
      </Text>
      <GlassCard padding="base">
        {items.map((item, i) => (
          <View key={item.route}>
            {i > 0 && (
              <View
                style={{
                  height: 1,
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                }}
              />
            )}
            <Pressable
              onPress={() => router.push(item.route as any)}
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
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: c.glass.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconSymbol name={item.icon as any} size={15} color={c.text.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text.primary, fontSize: 15, fontWeight: "700" }}>
                  {item.title}
                </Text>
                <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 1 }}>
                  {item.subtitle}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={12} color={c.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </GlassCard>
    </View>
  );
}

export default function SettingsTab() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  return (
    <Screen scroll>
      <Text
        style={{
          color: c.text.tertiary,
          fontSize: Typography.fontSize.xs,
          fontFamily: Typography.fontFamily.bold,
          letterSpacing: Typography.letterSpacing.allcaps,
          fontWeight: "800",
        }}
      >
        PREFERENCES
      </Text>
      <Text
        style={{
          color: c.text.primary,
          fontSize: 32,
          fontFamily: Typography.fontFamily.serifItalic,
          marginTop: 4,
          lineHeight: 38,
        }}
      >
        Settings
      </Text>

      <SettingsGroup label="YOUR APP" items={YOUR_APP} c={c} isDark={isDark} />
      <SettingsGroup label="YOUR DATA" items={YOUR_DATA} c={c} isDark={isDark} />
      <SettingsGroup label="SUPPORT & INFO" items={SUPPORT} c={c} isDark={isDark} />
      <SettingsGroup label="DEVELOPER" items={DEV} c={c} isDark={isDark} />

      <Text
        style={{
          color: c.text.tertiary,
          fontSize: 11,
          textAlign: "center",
          marginTop: Spacing.xl,
          marginBottom: Spacing.sm,
        }}
      >
        Life Balance Assistant · v1.0.0
      </Text>
    </Screen>
  );
}
