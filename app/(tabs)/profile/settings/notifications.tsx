import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import {
  cancelEveningEmotionNudge,
  ensureNotificationPermissions,
  scheduleDailyCheckInReminder,
  scheduleEveningEmotionNudge,
  sendTestNotificationNow,
} from "@/lib/notifications";
import { NUDGE_ENABLED_KEY, STREAKS_ENABLED_KEY, getBooleanSetting, setBooleanSetting } from "@/lib/privacy";

export default function NotificationsSettings() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [ready, setReady] = useState(false);
  const [nudgeEnabled, setNudgeEnabled] = useState(true);
  const [streaksEnabled, setStreaksEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      setNudgeEnabled(await getBooleanSetting(NUDGE_ENABLED_KEY, true));
      setStreaksEnabled(await getBooleanSetting(STREAKS_ENABLED_KEY, true));
      setReady(true);
    })();
  }, []);

  const onPermissions = async () => {
    const ok = await ensureNotificationPermissions();
    Alert.alert("Notifications", ok ? "Permissions granted." : "Permissions not granted.");
  };

  const onSchedule = async () => {
    const ok = await ensureNotificationPermissions();
    if (!ok) return;
    await scheduleDailyCheckInReminder(20, 30);
    if (nudgeEnabled) {
      await scheduleEveningEmotionNudge(20, 0);
    }
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
      <Text style={[styles.h1, { color: c.text.primary }]}>Notifications</Text>
      <Text style={[styles.sub, { color: c.text.secondary }]}>Reminders to keep your check-ins consistent.</Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Daily check-in reminder</Text>
        <Text style={[styles.cardSub, { color: c.text.secondary }]}>
          Request permissions, schedule a daily reminder, or send a test.
        </Text>

        <View style={styles.row}>
          <Pressable style={[styles.btn, { backgroundColor: c.accent.primary }]} onPress={onPermissions}>
            <Text style={styles.btnText}>Enable</Text>
          </Pressable>
          <Pressable style={[styles.btn, { backgroundColor: c.glass.primary }]} onPress={onSchedule}>
            <Text style={[styles.btnText, { color: c.text.primary }]}>Schedule</Text>
          </Pressable>
          <Pressable style={[styles.btn, { backgroundColor: c.glass.primary }]} onPress={onTest}>
            <Text style={[styles.btnText, { color: c.text.primary }]}>Test</Text>
          </Pressable>
        </View>

        {!ready ? <Text style={{ color: c.text.secondary }}>Loading…</Text> : null}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Nudges & streaks</Text>
        <Text style={[styles.cardSub, { color: c.text.secondary }]}>
          Keep adherence gentle: optional evening nudge and optional streak display.
        </Text>
        <Pressable
          style={[styles.toggleRow, { borderColor: c.border.medium }]}
          onPress={async () => {
            const next = !nudgeEnabled;
            setNudgeEnabled(next);
            await setBooleanSetting(NUDGE_ENABLED_KEY, next);
            if (!next) {
              await cancelEveningEmotionNudge();
            } else {
              const ok = await ensureNotificationPermissions();
              if (ok) await scheduleEveningEmotionNudge(20, 0);
            }
          }}
        >
          <Text style={{ color: c.text.primary, fontWeight: "700" }}>{nudgeEnabled ? "☑" : "☐"} Evening nudge at 8pm</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleRow, { borderColor: c.border.medium }]}
          onPress={async () => {
            const next = !streaksEnabled;
            setStreaksEnabled(next);
            await setBooleanSetting(STREAKS_ENABLED_KEY, next);
          }}
        >
          <Text style={{ color: c.text.primary, fontWeight: "700" }}>{streaksEnabled ? "☑" : "☐"} Show streaks in adherence cards</Text>
        </Pressable>
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
  toggleRow: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
});
