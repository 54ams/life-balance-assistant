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
        Tweak how the app looks, sounds, and handles your data.
      </Text>

      <View style={{ height: 16 }} />

      <Row
        title="Reminders"
        subtitle="A gentle nudge for your daily check-in"
        onPress={() => router.push("/profile/settings/notifications" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open reminder settings"
      />
      <Row
        title="Reflection tone"
        subtitle="Gentle, direct, or a bit playful"
        onPress={() => router.push("/profile/settings/reflection" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open reflection tone settings"
      />
      <Row
        title="What matters to you"
        subtitle="Pick a few values that guide your week"
        onPress={() => router.push("/profile/settings/values" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open values settings"
      />
      <Row
        title="Your data"
        subtitle="What's stored on this device, and for how long"
        onPress={() => router.push("/profile/settings/data" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open your data"
      />
      <Row
        title="Privacy notice"
        subtitle="A plain-English summary of what we store"
        onPress={() => router.push("/profile/settings/privacy" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open privacy notice"
      />
      <Row
        title="Consent & your choices"
        subtitle="What you agreed to, and how to change it"
        onPress={() => router.push("/profile/settings/consent" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open consent and choices"
      />
      <Row
        title="If you need support"
        subtitle="Quick-dial numbers and UK support services"
        onPress={() => router.push("/profile/settings/help" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open support resources"
      />
      <Row
        title="WHOOP permission"
        subtitle="Let us use your WHOOP data, or turn it off"
        onPress={() => router.push("/profile/settings/consent-whoop" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open WHOOP permission"
      />
      <Row
        title="Connect WHOOP"
        subtitle="Sign in and sync your wearable"
        onPress={() => router.push("/profile/integrations/whoop" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open WHOOP connection"
      />
      <Row
        title="How the score is built"
        subtitle="Peek under the hood of the balance score"
        onPress={() => router.push("/profile/settings/model" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open scoring model"
      />
      <Row
        title="Demo tools"
        subtitle="Load example data to explore the app"
        onPress={() => router.push("/profile/settings/demo" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open demo tools"
      />
      <Row
        title="Wrapping up"
        subtitle="Share feedback and take a copy of your data"
        onPress={() => router.push("/profile/settings/study" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open wrapping up"
      />
      <Row
        title="Under the bonnet"
        subtitle="A look at everything stored on this device"
        onPress={() => router.push("/audit" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open diagnostics"
      />
      <Row
        title="Share feedback"
        subtitle="A short survey about how the app felt"
        onPress={() => router.push("/profile/settings/usability" as any)}
        textColor={C.text.primary}
        mutedColor={C.text.secondary}
        accessibilityLabel="Open feedback survey"
      />
      <Row
        title="About"
        subtitle="What this app is, and isn't"
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
