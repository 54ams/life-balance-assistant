import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { upsertWearable } from "@/lib/storage";
import { todayISO } from "@/lib/util/todayISO";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { getWearableDays } from "@/lib/storage";
import { getAppConsent } from "@/lib/privacy";
import { AppError, toAppError } from "@/lib/errors";
import { refreshDerivedForDate } from "@/lib/pipeline";
import { checkBackendHealth, getBackendBaseUrl, getBackendFeatureMessage } from "@/lib/backend";

WebBrowser.maybeCompleteAuthSession();

const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_SCOPES = ["offline", "read:user", "read:recovery", "read:sleep", "read:workout", "read:cycle"].join(" ");
const PARTICIPANT_KEY = "whoop_participant_id";
const SESSION_KEY = "whoop_session_token";
const LAST_SYNC_KEY = "whoop_last_sync";

function randomId() {
  return Math.random().toString(36).slice(2);
}

export default function WhoopScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [consented, setConsented] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [whoopDaysLast7, setWhoopDaysLast7] = useState(0);
  const [manualRecovery, setManualRecovery] = useState("");
  const [manualSleep, setManualSleep] = useState("");
  const [manualStrain, setManualStrain] = useState("");
  const [whoopConsentGranted, setWhoopConsentGranted] = useState(false);
  const [backendStatus, setBackendStatus] = useState<Awaited<ReturnType<typeof checkBackendHealth>> | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>("");
  const backendUrl = getBackendBaseUrl();
  const backendUnavailableMessage = getBackendFeatureMessage();

  useEffect(() => {
    (async () => {
      const existing = await AsyncStorage.getItem(PARTICIPANT_KEY);
      const sess = await AsyncStorage.getItem(SESSION_KEY);
      const last = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (existing) setParticipantId(existing);
      else {
        const id = randomId();
        await AsyncStorage.setItem(PARTICIPANT_KEY, id);
        setParticipantId(id);
      }
      if (sess) setSessionToken(sess);
      if (sess) setConnected(true);
      if (last) setLastSynced(last);
      const days = await getWearableDays();
      const recentWhoop = days.filter((d) => String(d.source).startsWith("whoop"));
      setWhoopDaysLast7(recentWhoop.slice(-7).length);
      const appConsent = await getAppConsent();
      setConsented(!!appConsent && Object.values(appConsent.items).every(Boolean));
      setWhoopConsentGranted(!!(await AsyncStorage.getItem("whoop_consent_v1")));
      setBackendStatus(await checkBackendHealth());
    })();
  }, []);

  const redirectUri = useMemo(() => "lifebalanceapp://whoop-auth", []);
  const ready = !!participantId;

  const startConnect = async () => {
    if (!consented) {
      setSyncStatus("App consent required before connection.");
      Alert.alert("WHOOP", "Please provide app consent first in Settings > Consent.");
      return;
    }
    const storedConsent = await AsyncStorage.getItem("whoop_consent_v1");
    if (!storedConsent) {
      setSyncStatus("WHOOP-specific consent required before connection.");
      Alert.alert("WHOOP", "Please grant WHOOP consent in settings before connecting.");
      return;
    }
    if (!process.env.EXPO_PUBLIC_WHOOP_CLIENT_ID) {
      setSyncStatus("Client configuration missing.");
      Alert.alert("WHOOP", "Client ID not configured.");
      return;
    }
    if (!backendUrl) {
      setSyncStatus("Backend URL missing for this build.");
      Alert.alert("WHOOP", "WHOOP connection is unavailable in this build because no backend URL is configured.");
      return;
    }
    const authUrl = `${WHOOP_AUTH_URL}?client_id=${encodeURIComponent(
      process.env.EXPO_PUBLIC_WHOOP_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(WHOOP_SCOPES)}`;

    const result = await (AuthSession as any).startAsync({ authUrl });
    if (result.type !== "success" || !(result as any).params?.code) {
      Alert.alert("WHOOP", "Authentication was cancelled or failed.");
      return;
    }

    setBusy(true);
    try {
      const code = (result as any).params.code as string;
      const res = await fetch(`${backendUrl}/whoop/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirectUri, participantId }),
      });
      if (!res.ok) throw new AppError("AUTH", "WHOOP exchange failed.");
      const json = (await res.json()) as any;
      if (json?.sessionToken) {
        await AsyncStorage.setItem(SESSION_KEY, json.sessionToken);
        setSessionToken(json.sessionToken);
      }
      setConnected(true);
      setSyncStatus("WHOOP connected successfully.");
      Alert.alert("WHOOP", "Connected successfully.");
    } catch (err: any) {
      const e = toAppError(err, "Failed to connect WHOOP.");
      setSyncStatus(e.userMessage);
      Alert.alert("WHOOP", e.userMessage);
    } finally {
      setBusy(false);
    }
  };

  const syncDate = async (date: string) => {
    if (date > todayISO()) {
      setSyncStatus("Future dates are not allowed.");
      Alert.alert("WHOOP", "Future dates are not allowed.");
      return;
    }
    if (!sessionToken) {
      setSyncStatus("WHOOP is not connected.");
      Alert.alert("WHOOP", "Not connected yet.");
      return;
    }
    if (!backendUrl) {
      setSyncStatus("Backend URL missing for this build.");
      Alert.alert("WHOOP", "WHOOP sync is unavailable in this build because no backend URL is configured.");
      return;
    }
    const consent = await AsyncStorage.getItem("whoop_consent_v1");
    if (!consent) {
      setSyncStatus("WHOOP consent is missing.");
      Alert.alert("WHOOP", "Consent required. Please grant consent in WHOOP settings.");
      return;
    }
    setBusy(true);
    try {
      const url = `${backendUrl}/whoop/day?date=${encodeURIComponent(date)}`;
      let res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.status === 401) {
        await fetch(`${backendUrl}/whoop/refresh`, {
          method: "POST",
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        res = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
      }
      if (!res.ok) throw new AppError("NETWORK", `Sync failed (${res.status}).`);
      const json = (await res.json()) as any;
      const wearable = json?.data;
      if (!wearable) throw new AppError("NOT_FOUND", "No WHOOP data returned for that day.");
      await upsertWearable(date as any, wearable, "whoop_export");
      await refreshDerivedForDate(date as any);
      setLastSynced(date);
      await AsyncStorage.setItem(LAST_SYNC_KEY, date);
      setSyncStatus(`Synced wearable data for ${date}.`);
      Alert.alert("WHOOP", `Synced ${date}`);
    } catch (err: any) {
      const e = toAppError(err, "WHOOP sync failed.");
      setSyncStatus(e.userMessage);
      Alert.alert("WHOOP", e.userMessage);
    } finally {
      setBusy(false);
    }
  };

  const today = todayISO();

  const disconnect = async () => {
    if (!sessionToken) return;
    if (backendUrl) {
      try {
        await fetch(`${backendUrl}/whoop/session`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
      } catch {}
    }
    await AsyncStorage.multiRemove([SESSION_KEY, PARTICIPANT_KEY, LAST_SYNC_KEY]);
    setSessionToken(null);
    setConnected(false);
    setLastSynced(null);
    setParticipantId(null);
    setSyncStatus("WHOOP disconnected.");
  };

  const saveManual = async () => {
    const recovery = Number(manualRecovery);
    const sleepHours = Number(manualSleep);
    const strain = manualStrain.trim() ? Number(manualStrain) : undefined;
    if (!Number.isFinite(recovery) || recovery < 0 || recovery > 100) {
      Alert.alert("Manual entry", "Recovery must be between 0 and 100.");
      return;
    }
    if (!Number.isFinite(sleepHours) || sleepHours <= 0 || sleepHours > 14) {
      Alert.alert("Manual entry", "Sleep hours must be between 0 and 14.");
      return;
    }
    if (strain != null && (!Number.isFinite(strain) || strain < 0 || strain > 21)) {
      Alert.alert("Manual entry", "Strain must be between 0 and 21.");
      return;
    }
    await upsertWearable(selectedDate as any, { recovery, sleepHours, strain }, "simulated_stub");
    await refreshDerivedForDate(selectedDate as any);
    Alert.alert("Saved", `Manual wearable data saved for ${selectedDate}.`);
  };

  return (
    <Screen scroll>
      <Text style={[styles.h1, { color: c.text.primary }]}>WHOOP integration</Text>
      <Text style={[styles.sub, { color: c.text.secondary }]}>Data imported from WHOOP. Correlation ≠ causation.</Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Connection</Text>
        <Text style={{ color: c.text.secondary, marginTop: 6 }}>
          Connect your WHOOP account to sync recovery, sleep, and strain.
        </Text>
        <Text style={{ color: c.text.secondary, marginTop: 6 }}>
          Backend: {backendStatus?.ok ? "ready" : "not ready"} • {backendStatus?.url ?? getBackendBaseUrl()}
        </Text>
        <Text style={{ color: c.text.secondary, marginTop: 4 }}>
          WHOOP client ID: {process.env.EXPO_PUBLIC_WHOOP_CLIENT_ID ? "configured" : "missing"} • backend WHOOP: {backendStatus?.whoopConfigured ? "configured" : "missing"}
        </Text>
        <Text style={{ color: c.text.secondary, marginTop: 4 }}>
          WHOOP consent: {whoopConsentGranted ? "granted" : "not granted"}
        </Text>
        <Text style={{ color: c.text.secondary, marginTop: 4 }}>
          LLM reflections: {backendStatus?.llmConfigured ? "configured" : "missing API key"}
        </Text>
        {!backendStatus?.ok ? (
          <Text style={{ color: c.danger ?? c.text.secondary, marginTop: 6 }}>
            Runtime issue: {backendStatus?.message ?? "Backend unavailable"}.
          </Text>
        ) : null}
        {backendUnavailableMessage ? (
          <Text style={{ color: c.text.secondary, marginTop: 6 }}>
            {backendUnavailableMessage}
          </Text>
        ) : null}
        <View
          style={[
            styles.checkbox,
            {
              borderColor: c.border.medium,
              backgroundColor: consented ? c.accent.primary : "transparent",
            },
          ]}
        >
          <Text style={{ color: c.text.primary, fontWeight: "700" }}>
            {consented ? "☑" : "☐"} WHOOP consent status from Settings
          </Text>
        </View>
        <View style={{ marginTop: 12 }}>
          <View style={{ gap: 8 }}>
            <Button
              title={connected ? "Connected" : "Connect WHOOP"}
              onPress={startConnect}
              disabled={busy || !ready || !backendStatus?.ok}
              accessibilityLabel="Connect WHOOP"
            />
            {connected ? (
              <Button
                title="Disconnect WHOOP"
                variant="secondary"
                onPress={disconnect}
                disabled={busy}
                accessibilityLabel="Disconnect WHOOP"
              />
            ) : null}
          </View>
        </View>
        <Text style={{ color: c.text.secondary, marginTop: 8 }}>Participant: {participantId ?? "Loading…"}</Text>
        <Text style={{ color: c.text.secondary, marginTop: 4 }}>Status: {connected ? "Connected" : "Not connected"}</Text>
        <Text style={{ color: c.text.secondary, marginTop: 4 }}>Last synced: {lastSynced ?? "—"}</Text>
        <Text style={{ color: c.text.secondary, marginTop: 4 }}>WHOOP days in last 7: {whoopDaysLast7}/7</Text>
        {syncStatus ? <Text style={{ color: c.text.secondary, marginTop: 6 }}>Status: {syncStatus}</Text> : null}
        <Text style={{ color: c.text.tertiary, marginTop: 6 }}>
          Data is cached for 24h per day to respect WHOOP rate limits. If WHOOP is unavailable, use the manual path below to preserve the dissertation demo flow.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Sync</Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          <Button
            title={busy ? "Syncing…" : "Sync today"}
            onPress={() => syncDate(today)}
            disabled={!connected || busy || !ready || !backendStatus?.ok}
            accessibilityLabel="Sync today's WHOOP data"
          />
          <InsightsDatePicker
            date={selectedDate as any}
            onChange={(d) => setSelectedDate(d)}
            allowToday={true}
            title="Pick a past date"
            helperText="Past dates only; WHOOP API blocks future days."
          />
          <Button
            title={busy ? "Syncing…" : `Sync ${selectedDate}`}
            onPress={() => syncDate(selectedDate)}
            disabled={!connected || busy || !ready || !backendStatus?.ok}
            accessibilityLabel="Sync selected date"
          />
        </View>
        <Text style={{ color: c.text.secondary, marginTop: 8 }}>Last synced: {lastSynced ?? "—"}</Text>
        <Text style={{ color: c.text.secondary, marginTop: 4 }}>If WHOOP fails, manual wearable entry below uses the same scoring pipeline.</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Manual wearable entry</Text>
        <Text style={{ color: c.text.secondary, marginTop: 6 }}>
          Use this when WHOOP is unavailable but you still need biometric inputs for the prototype.
        </Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          <TextInput
            value={manualRecovery}
            onChangeText={setManualRecovery}
            keyboardType="number-pad"
            placeholder="Recovery (0-100)"
            placeholderTextColor={c.text.tertiary}
            style={[styles.input, { borderColor: c.border.medium, color: c.text.primary }]}
          />
          <TextInput
            value={manualSleep}
            onChangeText={setManualSleep}
            keyboardType="decimal-pad"
            placeholder="Sleep hours"
            placeholderTextColor={c.text.tertiary}
            style={[styles.input, { borderColor: c.border.medium, color: c.text.primary }]}
          />
          <TextInput
            value={manualStrain}
            onChangeText={setManualStrain}
            keyboardType="decimal-pad"
            placeholder="Strain (optional)"
            placeholderTextColor={c.text.tertiary}
            style={[styles.input, { borderColor: c.border.medium, color: c.text.primary }]}
          />
          <Button title={`Save ${selectedDate}`} onPress={saveManual} accessibilityLabel="Save manual wearable data" />
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: "800" },
  sub: { marginTop: 6, marginBottom: 14 },
  card: { padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800" },
  link: { paddingVertical: 8 },
  checkbox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
