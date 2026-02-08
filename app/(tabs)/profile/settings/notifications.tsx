import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ensureNotificationPermissions,
  scheduleDailyCheckInReminder,
  sendTestNotificationNow,
} from "@/lib/notifications";

export default function NotificationsSettings() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const onPermissions = async () => {
    const ok = await ensureNotificationPermissions();
    Alert.alert("Notifications", ok ? "Permissions granted." : "Permissions not granted.");
  };

  const onSchedule = async () => {
    const ok = await ensureNotificationPermissions();
    if (!ok) return;
    await scheduleDailyCheckInReminder();
    Alert.alert("Scheduled", "Daily reminder scheduled.");
  };

  const onTest = async () => {
    const ok = await ensureNotificationPermissions();
    if (!ok) return;
    await sendTestNotificationNow();
    Alert.alert("Sent", "Test notification sent.");
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <Text style={[styles.h1, { color: c.text }]}>Notifications</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Reminders to keep your check-ins consistent.</Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Daily check-in reminder</Text>
        <Text style={[styles.cardSub, { color: c.muted }]}>
          Request permissions, schedule a daily reminder, or send a test.
        </Text>

        <View style={styles.row}>
          <Pressable style={[styles.btn, { backgroundColor: c.tint }]} onPress={onPermissions}>
            <Text style={styles.btnText}>Enable</Text>
          </Pressable>
          <Pressable style={[styles.btn, { backgroundColor: c.card }]} onPress={onSchedule}>
            <Text style={[styles.btnText, { color: c.text }]}>Schedule</Text>
          </Pressable>
          <Pressable style={[styles.btn, { backgroundColor: c.card }]} onPress={onTest}>
            <Text style={[styles.btnText, { color: c.text }]}>Test</Text>
          </Pressable>
        </View>

        {!ready ? <Text style={{ color: c.muted }}>Loading…</Text> : null}
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 34, fontWeight: "800" },
  sub: { marginTop: 4, marginBottom: 14 },
  card: { padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardSub: { marginTop: 6, marginBottom: 12, lineHeight: 18 },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  btnText: { fontWeight: "800", color: "#fff" },
});
