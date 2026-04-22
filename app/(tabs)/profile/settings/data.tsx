import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { clearAll, clearAllPlans } from "@/lib/storage";
import { clearSusSubmissions } from "@/lib/evaluation/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  APP_CONSENT_KEY,
  EXPORT_ANONYMIZE_ID_KEY,
  EXPORT_REDACT_TEXT_KEY,
  LLM_ENABLED_KEY,
  NUDGE_ENABLED_KEY,
  RETENTION_DAYS_KEY,
  STREAKS_ENABLED_KEY,
  WHOOP_CONSENT_KEY,
  getBooleanSetting,
  getRetentionDays,
  runRetentionPurgeNow,
  setBooleanSetting,
  setRetentionDays,
} from "@/lib/privacy";
import { getBackendBaseUrl } from "@/lib/backend";

export default function DataSettings() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [busy, setBusy] = useState(false);
  const [retentionDays, setRetentionDaysState] = useState(90);
  const [redactText, setRedactText] = useState(true);
  const [anonymizeId, setAnonymizeId] = useState(true);
  const [nudgeEnabled, setNudgeEnabled] = useState(true);
  const [streakEnabled, setStreakEnabled] = useState(true);
  const [llmEnabled, setLlmEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      setRetentionDaysState(await getRetentionDays());
      setRedactText(await getBooleanSetting(EXPORT_REDACT_TEXT_KEY, true));
      setAnonymizeId(await getBooleanSetting(EXPORT_ANONYMIZE_ID_KEY, true));
      setNudgeEnabled(await getBooleanSetting(NUDGE_ENABLED_KEY, true));
      setStreakEnabled(await getBooleanSetting(STREAKS_ENABLED_KEY, true));
      setLlmEnabled(await getBooleanSetting(LLM_ENABLED_KEY, true));
    })();
  }, []);

  const onReset = () => {
    Alert.alert(
      "Clear saved plans?",
      "Removes every generated plan from this device. Check-ins and wearable data stay intact. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear plans",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await clearAllPlans();
              Alert.alert("Reset", "All stored plans were cleared.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const onDeleteAll = () => {
    Alert.alert(
      "Delete everything?",
      "Wipes all check-ins, wearable data, plans, SUS submissions, WHOOP session, and settings from this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete all",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await clearAll();
              await clearSusSubmissions();
              // Also disconnect WHOOP session on server if present
              const session = await AsyncStorage.getItem("whoop_session_token");
              const backendUrl = getBackendBaseUrl();
              if (session && backendUrl) {
                try {
                  await fetch(`${backendUrl}/whoop/session`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${session}` },
                  });
                } catch {}
              }
              await AsyncStorage.multiRemove([
                "whoop_session_token",
                "whoop_participant_id",
                "whoop_last_sync",
                "life_balance_insights_selected_date_v1",
                "demo_enabled_v1",
                "demo_override_checkin_v1",
                "demo_override_wearable_v1",
                APP_CONSENT_KEY,
                WHOOP_CONSENT_KEY,
                RETENTION_DAYS_KEY,
                EXPORT_ANONYMIZE_ID_KEY,
                EXPORT_REDACT_TEXT_KEY,
                LLM_ENABLED_KEY,
                NUDGE_ENABLED_KEY,
                STREAKS_ENABLED_KEY,
              ]);
              Alert.alert("Deleted", "All local data (check-ins, wearables, plans, SUS) was removed from this device.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const onPurgeNow = async () => {
    setBusy(true);
    try {
      const result = await runRetentionPurgeNow();
      Alert.alert(
        "Purge complete",
        `Removed ${result.recordsRemoved} records, ${result.plansRemoved} plans, ${result.futureEventsRemoved} future events, ${result.susRemoved} SUS entries.`
      );
    } finally {
      setBusy(false);
    }
  };

  const chooseRetention = async (days: number) => {
    await setRetentionDays(days);
    setRetentionDaysState(days);
  };

  const toggleSetting = async (
    key: string,
    value: boolean,
    setter: (v: boolean) => void
  ) => {
    setter(value);
    await setBooleanSetting(key, value);
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <Text style={[styles.h1, { color: c.text.primary }]}>Data & privacy</Text>
      <Text style={[styles.sub, { color: c.text.secondary }]}>Daily records stay on-device; WHOOP session tokens stay on the backend only.</Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Local storage</Text>
        <Text style={[styles.cardSub, { color: c.text.secondary }]}>Check-ins, wearable imports, and plans are stored in AsyncStorage.</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Retention</Text>
        <Text style={[styles.cardSub, { color: c.text.secondary }]}>Keep last {retentionDays} days only.</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {[30, 90, 180, 365].map((d) => {
            const active = d === retentionDays;
            return (
              <Pressable
                key={d}
                onPress={() => chooseRetention(d)}
                style={[
                  styles.pill,
                  { borderColor: c.border.medium, backgroundColor: active ? c.accent.primary : "transparent" },
                ]}
              >
                <Text style={{ color: active ? c.onPrimary : c.text.primary, fontWeight: "700" }}>{d}d</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable disabled={busy} style={[styles.btn, { backgroundColor: c.accent.primary }]} onPress={onPurgeNow}>
          <Text style={[styles.btnText, { color: c.onPrimary }]}>{busy ? "Purging…" : "Purge now"}</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Export controls</Text>
        <Text style={[styles.cardSub, { color: c.text.secondary }]}>Apply these options to research exports.</Text>
        <Pressable
          onPress={() => toggleSetting(EXPORT_ANONYMIZE_ID_KEY, !anonymizeId, setAnonymizeId)}
          style={[styles.check, { borderColor: c.border.medium }]}
        >
          <Text style={{ color: c.text.primary, fontWeight: "700" }}>{anonymizeId ? "☑" : "☐"} Anonymize participant ID (hash)</Text>
        </Pressable>
        <Pressable
          onPress={() => toggleSetting(EXPORT_REDACT_TEXT_KEY, !redactText, setRedactText)}
          style={[styles.check, { borderColor: c.border.medium }]}
        >
          <Text style={{ color: c.text.primary, fontWeight: "700" }}>{redactText ? "☑" : "☐"} Redact free-text notes/reflections</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Adherence options</Text>
        <Pressable
          onPress={() => toggleSetting(NUDGE_ENABLED_KEY, !nudgeEnabled, setNudgeEnabled)}
          style={[styles.check, { borderColor: c.border.medium }]}
        >
          <Text style={{ color: c.text.primary, fontWeight: "700" }}>{nudgeEnabled ? "☑" : "☐"} Enable evening nudges</Text>
        </Pressable>
        <Pressable
          onPress={() => toggleSetting(STREAKS_ENABLED_KEY, !streakEnabled, setStreakEnabled)}
          style={[styles.check, { borderColor: c.border.medium }]}
        >
          <Text style={{ color: c.text.primary, fontWeight: "700" }}>{streakEnabled ? "☑" : "☐"} Show streaks in insights</Text>
        </Pressable>
        <Pressable
          onPress={() => toggleSetting(LLM_ENABLED_KEY, !llmEnabled, setLlmEnabled)}
          style={[styles.check, { borderColor: c.border.medium }]}
        >
          <Text style={{ color: c.text.primary, fontWeight: "700" }}>{llmEnabled ? "☑" : "☐"} Enable LLM reflections (non-medical)</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Reset demo data</Text>
        <Text style={[styles.cardSub, { color: c.text.secondary }]}>Clears saved plan outputs so you can re-demo from scratch.</Text>
        <Pressable disabled={busy} style={[styles.btn, { backgroundColor: c.accent.primary, opacity: busy ? 0.6 : 1 }]} onPress={onReset}>
          <Text style={[styles.btnText, { color: c.onPrimary }]}>{busy ? "Clearing…" : "Clear saved plans"}</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Delete all local data</Text>
        <Text style={[styles.cardSub, { color: c.text.secondary }]}>
          Removes all check-ins, wearables, plans, and SUS submissions stored on this device.
        </Text>
        <Pressable
          disabled={busy}
          style={[styles.btn, { backgroundColor: c.danger, opacity: busy ? 0.6 : 1 }]}
          onPress={onDeleteAll}
        >
          <Text style={styles.btnText}>{busy ? "Deleting…" : "Delete everything"}</Text>
        </Pressable>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 34, fontWeight: "800" },
  sub: { marginTop: 4, marginBottom: 14 },
  card: { padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardSub: { marginTop: 6, marginBottom: 12, lineHeight: 18 },
  btn: { paddingVertical: 12, borderRadius: 999, alignItems: "center" },
  btnText: { fontWeight: "800", color: "#fff" },
  pill: { borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 10 },
  check: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
});
