import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { seedDemoData } from "../../lib/demoSeed";
import {
    ensureNotificationPermissions,
    scheduleDailyCheckInReminder,
    sendTestNotificationNow,
} from "../../lib/notifications";

export default function SettingsScreen() {
  const onSeed = async () => {
    await seedDemoData(14);
    Alert.alert("Done", "Seeded 14 days of demo data.");
  };

  const onEnableReminder = async () => {
    const ok = await ensureNotificationPermissions();
    if (!ok) {
      Alert.alert("Permission needed", "Enable notifications in Settings to use reminders.");
      return;
    }
    await scheduleDailyCheckInReminder(20, 0);
    Alert.alert("Scheduled", "Daily check-in reminder set for 8:00 PM.");
  };

  const onTestNotif = async () => {
    const ok = await ensureNotificationPermissions();
    if (!ok) {
      Alert.alert("Permission needed", "Please allow notifications first.");
      return;
    }
    await sendTestNotificationNow();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <TouchableOpacity style={styles.button} onPress={onSeed}>
        <Text style={styles.buttonText}>Seed 14 Days Demo Data</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={onEnableReminder}>
        <Text style={styles.buttonText}>Enable Daily Reminder (8:00 PM)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={onTestNotif}>
        <Text style={styles.buttonText}>Send Test Notification Now</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        This is for demos and development. You can remove it later.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0f172a" },
  title: { fontSize: 28, fontWeight: "600", color: "#f8fafc", marginBottom: 16 },
  button: { backgroundColor: "#38bdf8", padding: 16, borderRadius: 14 },
  buttonText: { textAlign: "center", fontWeight: "700", color: "#001018", fontSize: 16 },
  note: { marginTop: 14, color: "#94a3b8" },
});
