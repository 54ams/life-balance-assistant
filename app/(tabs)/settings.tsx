import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { seedDemoData } from "../../lib/demoSeed";
import {
  ensureNotificationPermissions,
  scheduleDailyCheckInReminder,
  sendTestNotificationNow,
} from "../../lib/notifications";

import {
  clearDemoOverrides,
  isDemoEnabled,
  setDemoCheckIn,
  setDemoEnabled,
  setDemoWearable,
} from "../../lib/demo";

import type { DailyCheckIn } from "../../lib/storage";

export default function SettingsScreen() {
  const [demoOn, setDemoOn] = useState(false);

  useEffect(() => {
    (async () => {
      const on = await isDemoEnabled();
      setDemoOn(on);
    })();
  }, []);

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

  // ✅ Demo mode controls
  const onToggleDemo = async () => {
    const next = !demoOn;
    setDemoOn(next);
    await setDemoEnabled(next);
    Alert.alert("Demo Mode", next ? "Enabled" : "Disabled");
  };

  const onRecoveryPreset = async () => {
    await setDemoEnabled(true);
    setDemoOn(true);

    await setDemoWearable({ recovery: 30, sleepHours: 5.5 });

    // Your DailyCheckIn type includes more fields than mood/stress.
    // For demo override, we only need mood/stress → cast to satisfy TS.
    const recoveryCheckIn = { mood: 2, stress: 4 } as unknown as DailyCheckIn;
    await setDemoCheckIn(recoveryCheckIn);

    Alert.alert("Demo preset", "Recovery day preset applied. Go to Home.");
  };

  const onNormalPreset = async () => {
    await setDemoEnabled(true);
    setDemoOn(true);

    await setDemoWearable({ recovery: 75, sleepHours: 8.0 });

    const normalCheckIn = { mood: 4, stress: 2 } as unknown as DailyCheckIn;
    await setDemoCheckIn(normalCheckIn);

    Alert.alert("Demo preset", "Normal day preset applied. Go to Home.");
  };

  const onClearOverrides = async () => {
    await clearDemoOverrides();
    Alert.alert("Demo", "Cleared demo overrides.");
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

      <Text style={styles.sectionTitle}>Demo Mode</Text>

      <TouchableOpacity
        style={[styles.buttonAlt, demoOn && styles.buttonAltOn]}
        onPress={onToggleDemo}
      >
        <Text style={styles.buttonAltText}>Demo Mode: {demoOn ? "ON" : "OFF"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.buttonAlt, { marginTop: 12 }]} onPress={onRecoveryPreset}>
        <Text style={styles.buttonAltText}>Apply Recovery Day Preset</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.buttonAlt, { marginTop: 12 }]} onPress={onNormalPreset}>
        <Text style={styles.buttonAltText}>Apply Normal Day Preset</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.buttonAlt, styles.danger, { marginTop: 12 }]}
        onPress={onClearOverrides}
      >
        <Text style={styles.buttonAltText}>Clear Demo Overrides</Text>
      </TouchableOpacity>

      <Text style={styles.note}>This is for demos and development. You can remove it later.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0f172a" },
  title: { fontSize: 28, fontWeight: "600", color: "#f8fafc", marginBottom: 16 },

  button: { backgroundColor: "#38bdf8", padding: 16, borderRadius: 14 },
  buttonText: { textAlign: "center", fontWeight: "700", color: "#001018", fontSize: 16 },

  sectionTitle: { marginTop: 22, marginBottom: 10, color: "#94a3b8", fontWeight: "700" },

  buttonAlt: { backgroundColor: "#0b1224", padding: 16, borderRadius: 14 },
  buttonAltOn: { backgroundColor: "#065f46" },
  buttonAltText: { textAlign: "center", fontWeight: "700", color: "#f8fafc", fontSize: 16 },

  danger: { backgroundColor: "#7f1d1d" },

  note: { marginTop: 14, color: "#94a3b8" },
});
