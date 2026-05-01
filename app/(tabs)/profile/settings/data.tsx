import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { clearAll, clearAllPlans } from "@/lib/storage";
import { clearSusSubmissions } from "@/lib/evaluation/storage";
import { confirmDestructive, notify } from "@/lib/util/confirm";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EXPORT_ANONYMIZE_ID_KEY,
  EXPORT_REDACT_TEXT_KEY,
  LLM_ENABLED_KEY,
  NUDGE_ENABLED_KEY,
  STREAKS_ENABLED_KEY,
  getBooleanSetting,
  getRetentionDays,
  runRetentionPurgeNow,
  setBooleanSetting,
  setRetentionDays,
} from "@/lib/privacy";
import { KEY_WHOOP_SESSION } from "@/lib/storageKeys";
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

  const onReset = async () => {
    const ok = await confirmDestructive(
      "Clear saved plans?",
      "Removes every generated plan from this device. Check-ins and wearable data stay intact. This cannot be undone.",
      "Clear plans",
    );
    if (!ok) return;
    setBusy(true);
    try {
      await clearAllPlans();
      notify("Plans cleared", "All stored plans were removed from this device.");
    } catch (err: any) {
      notify("Clear failed", err?.message ?? "Could not clear plans. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onDeleteAll = async () => {
    const ok = await confirmDestructive(
      "Are you sure you want to delete all local data?",
      "This cannot be undone. Wipes all check-ins, wearable data, plans, habits, reframes, SUS submissions, WHOOP session, and every preference from this device.",
      "Delete all",
    );
    if (!ok) return;
    setBusy(true);
    try {
      // Disconnect WHOOP session on server BEFORE wiping local tokens, so the
      // backend can revoke. If it fails (network/offline) we still proceed.
      const session = await AsyncStorage.getItem(KEY_WHOOP_SESSION);
      const backendUrl = getBackendBaseUrl();
      if (session && backendUrl) {
        try {
          await fetch(`${backendUrl}/whoop/session`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session}` },
          });
        } catch {}
      }
      // clearAll() now resolves every registered key from storageKeys.ts —
      // plans, records, habits, reframes, anchors, schedules, ML caches,
      // smart-rec prefix family, feature-guide flags, WHOOP tokens, demo
      // flags, etc. clearSusSubmissions() is also covered by clearAll() but
      // calling it explicitly keeps intent legible.
      await clearAll();
      await clearSusSubmissions();
      // Reset local UI state so the screen reflects the wipe immediately.
      setRetentionDaysState(90);
      setRedactText(true);
      setAnonymizeId(true);
      setNudgeEnabled(true);
      setStreakEnabled(true);
      setLlmEnabled(true);
      notify(
        "All local data deleted",
        "Every check-in, wearable record, plan, habit, reflection, and preference was removed from this device.",
      );
    } catch (err: any) {
      notify("Delete failed", err?.message ?? "Could not delete data. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onPurgeNow = async () => {
    const ok = await confirmDestructive(
      `Purge data older than ${retentionDays} days?`,
      "Records, plans, and future events outside the retention window will be removed from this device. This cannot be undone.",
      "Purge",
    );
    if (!ok) return;
    setBusy(true);
    try {
      const result = await runRetentionPurgeNow();
      notify(
        "Purge complete",
        `Removed ${result.recordsRemoved} records, ${result.plansRemoved} plans, ${result.futureEventsRemoved} future events, ${result.susRemoved} SUS entries.`,
      );
    } catch (err: any) {
      notify("Purge failed", err?.message ?? "Could not purge data. Please try again.");
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
