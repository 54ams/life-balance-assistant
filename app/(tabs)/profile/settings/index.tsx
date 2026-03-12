import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";

function Row({
  title,
  subtitle,
  onPress,
  textColor,
  mutedColor,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  textColor: string;
  mutedColor: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ marginBottom: 12 }}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
    >
      <GlassCard>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: textColor }]}>{title}</Text>
            {!!subtitle && <Text style={[styles.rowSub, { color: mutedColor }]}>{subtitle}</Text>}
          </View>
          <Text style={[styles.chev, { color: mutedColor }]}>›</Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

export default function SettingsTab() {
  const scheme = useColorScheme();
  const C = Colors[scheme ?? "light"];

  return (
    <Screen scroll>
      <Text style={[styles.h1, { color: C.text.primary }]}>Settings</Text>
      <Text style={[styles.sub, { color: C.text.secondary }]}>
        Preferences, data, and tools.
      </Text>

      <View style={{ height: 16 }} />

      <Row
        title="Notifications"
        subtitle="Daily check-in reminder"
        onPress={() => router.push("/profile/settings/notifications" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open notification settings"
      />
      <Row
        title="Values"
        subtitle="Choose up to 6 guiding values"
        onPress={() => router.push("/profile/settings/values" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open values settings"
      />
      <Row
        title="Data & privacy"
        subtitle="What is stored locally and how exports work"
        onPress={() => router.push("/profile/settings/data" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open data and privacy"
      />
      <Row
        title="Privacy notice"
        subtitle="Plain-language GDPR summary"
        onPress={() => router.push("/profile/settings/privacy" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open privacy notice"
      />
      <Row
        title="Consent & safety"
        subtitle="Participation, risks, and crisis resources"
        onPress={() => router.push("/profile/settings/consent" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open consent and safety"
      />
      <Row
        title="Safety resources"
        subtitle="Immediate help and crisis links"
        onPress={() => router.push("/profile/settings/help" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open safety resources"
      />
      <Row
        title="WHOOP consent"
        subtitle="Grant or withdraw WHOOP data access"
        onPress={() => router.push("/profile/settings/consent-whoop" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open WHOOP consent"
      />
      <Row
        title="WHOOP integration"
        subtitle="Connect and sync wearables"
        onPress={() => router.push("/profile/integrations/whoop" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open WHOOP integration"
      />
      <Row
        title="Scoring model"
        subtitle="Weights, thresholds, sensitivity"
        onPress={() => router.push("/profile/settings/model" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open scoring model"
      />
      <Row
        title="Demo tools"
        subtitle="Seed data and test reminders"
        onPress={() => router.push("/profile/settings/demo" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open demo tools"
      />
      <Row
        title="Study completion"
        subtitle="Finish SUS and export the research bundle"
        onPress={() => router.push("/profile/settings/study" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open study completion"
      />
      <Row
        title="Diagnostics"
        subtitle="Inspect stored records, plans, and recent samples"
        onPress={() => router.push("/audit" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open diagnostics"
      />
      <Row
        title="Usability survey"
        subtitle="Complete SUS and save participant feedback"
        onPress={() => router.push("/profile/settings/usability" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open usability survey"
      />
      <Row
        title="About"
        subtitle="Project version and credits"
        onPress={() => router.push("/profile/settings/about" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open about screen"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 34, fontWeight: "800" },
  sub: { marginTop: 6, fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  rowTitle: { fontSize: 16, fontWeight: "800" },
  rowSub: { marginTop: 4, fontSize: 13, opacity: 0.85 },
  chev: { fontSize: 26, opacity: 0.5, marginLeft: 10 },
});
