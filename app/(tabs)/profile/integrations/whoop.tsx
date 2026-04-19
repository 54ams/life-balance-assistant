import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Colors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useColorScheme } from "react-native";
import { upsertWearable } from "@/lib/storage";
import { todayISO } from "@/lib/util/todayISO";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { getWearableDays } from "@/lib/storage";
import { AppError, toAppError } from "@/lib/errors";
import { refreshDerivedForDate } from "@/lib/pipeline";
import { getBackendBaseUrl } from "@/lib/backend";
import { formatDateFriendly } from "@/lib/util/formatDate";

WebBrowser.maybeCompleteAuthSession();

const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_SCOPES = ["offline", "read:profile", "read:recovery", "read:sleep", "read:workout", "read:cycles"].join(" ");
const PARTICIPANT_KEY = "whoop_participant_id";
const SESSION_KEY = "whoop_session_token";
const LAST_SYNC_KEY = "whoop_last_sync";
const CONSENT_KEY = "whoop_consent_v1";

function randomId() {
  return Math.random().toString(36).slice(2);
}

export default function WhoopScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [whoopDaysLast7, setWhoopDaysLast7] = useState(0);
  const [manualRecovery, setManualRecovery] = useState("");
  const [manualSleep, setManualSleep] = useState("");
  const [manualStrain, setManualStrain] = useState("");
  const [consentGranted, setConsentGranted] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const backendUrl = getBackendBaseUrl();

  useEffect(() => {
    (async () => {
      const existing = await AsyncStorage.getItem(PARTICIPANT_KEY);
      const sess = await AsyncStorage.getItem(SESSION_KEY);
      const last = await AsyncStorage.getItem(LAST_SYNC_KEY);
      const consent = await AsyncStorage.getItem(CONSENT_KEY);
      if (existing) setParticipantId(existing);
      else {
        const id = randomId();
        await AsyncStorage.setItem(PARTICIPANT_KEY, id);
        setParticipantId(id);
      }
      if (sess && backendUrl) {
        // Verify the session is still valid before showing as connected
        try {
          const res = await fetch(`${backendUrl}/whoop/refresh`, {
            method: "POST",
            headers: { Authorization: `Bearer ${sess}` },
          });
          if (res.ok) {
            setSessionToken(sess);
            setConnected(true);
          } else {
            // Session expired — clean up
            await AsyncStorage.multiRemove([SESSION_KEY, LAST_SYNC_KEY]);
          }
        } catch {
          // Backend unreachable — trust stored session for now
          setSessionToken(sess);
          setConnected(true);
        }
      }
      if (last) setLastSynced(last);
      if (consent) setConsentGranted(true);
      const days = await getWearableDays();
      const recentWhoop = days.filter((d) => String(d.source).startsWith("whoop"));
      setWhoopDaysLast7(recentWhoop.slice(-7).length);
    })();
  }, []);

  const redirectUri = useMemo(() => "lifebalanceapp://whoop-auth", []);
  const ready = !!participantId;

  const grantConsentAndConnect = async () => {
    await AsyncStorage.setItem(CONSENT_KEY, new Date().toISOString());
    setConsentGranted(true);
    setShowConsent(false);
    // Now proceed to OAuth
    await doConnect();
  };

  const startConnect = async () => {
    if (!consentGranted) {
      // Show inline consent instead of navigating away
      setShowConsent(true);
      return;
    }
    await doConnect();
  };

  const doConnect = async () => {
    if (!process.env.EXPO_PUBLIC_WHOOP_CLIENT_ID) {
      Alert.alert("WHOOP", "Client ID not configured.");
      return;
    }
    if (!backendUrl) {
      Alert.alert("WHOOP", "WHOOP connection is unavailable in this build.");
      return;
    }
    const state = randomId() + randomId();
    const authUrl = `${WHOOP_AUTH_URL}?client_id=${encodeURIComponent(
      process.env.EXPO_PUBLIC_WHOOP_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(WHOOP_SCOPES)}&state=${encodeURIComponent(state)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    if (result.type !== "success" || !result.url) {
      Alert.alert("WHOOP", "Authentication was cancelled or failed.");
      return;
    }

    const params = new URL(result.url).searchParams;
    const error = params.get("error");
    if (error) {
      const desc = params.get("error_description") || error;
      Alert.alert("WHOOP", `Auth error: ${desc}`);
      return;
    }
    const code = params.get("code");
    if (!code) {
      Alert.alert("WHOOP", `No authorization code received.\n\nRedirect: ${result.url}`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${backendUrl}/whoop/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirectUri, participantId }),
      });
      if (!res.ok) throw new AppError("AUTH", "WHOOP exchange failed.");
      const json = (await res.json()) as any;
      if (!json?.sessionToken) throw new AppError("AUTH", "No session token received.");
      await AsyncStorage.setItem(SESSION_KEY, json.sessionToken);
      setSessionToken(json.sessionToken);
      setConnected(true);
      // Auto-sync today after connecting
      const todayDate = todayISO();
      try {
        const syncUrl = `${backendUrl}/whoop/day?date=${encodeURIComponent(todayDate)}`;
        const syncRes = await fetch(syncUrl, {
          method: "GET",
          headers: { Authorization: `Bearer ${json.sessionToken}` },
        });
        if (syncRes.ok) {
          const syncJson = (await syncRes.json()) as any;
          const wearable = syncJson?.data;
          if (wearable) {
            await upsertWearable(todayDate as any, wearable, "whoop_export");
            await refreshDerivedForDate(todayDate as any);
            setLastSynced(todayDate);
            await AsyncStorage.setItem(LAST_SYNC_KEY, todayDate);
            Alert.alert("WHOOP", `Connected and synced ${formatDateFriendly(todayDate)}.`);
          } else {
            Alert.alert("WHOOP", "Connected! No data for today yet \u2014 your cycle may not have completed. Try syncing later or sync a past date.");
          }
        } else {
          const errJson = await syncRes.json().catch(() => ({}));
          Alert.alert("WHOOP", `Connected, but sync failed: ${(errJson as any)?.error || syncRes.status}`);
        }
      } catch {
        Alert.alert("WHOOP", "Connected! Sync will be available shortly.");
      }
    } catch (err: any) {
      const e = toAppError(err, "Failed to connect WHOOP.");
      Alert.alert("WHOOP", e.userMessage);
    } finally {
      setBusy(false);
    }
  };

  const syncDate = async (date: string) => {
    if (date > todayISO()) {
      Alert.alert("WHOOP", "Future dates are not allowed.");
      return;
    }
    if (!sessionToken || !backendUrl) {
      Alert.alert("WHOOP", "Not connected yet.");
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
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new AppError("NETWORK", `Sync failed: ${(errJson as any)?.error || res.status}`);
      }
      const json = (await res.json()) as any;
      const wearable = json?.data;
      if (!wearable) throw new AppError("NOT_FOUND", "No WHOOP data returned for that day.");
      await upsertWearable(date as any, wearable, "whoop_export");
      await refreshDerivedForDate(date as any);
      setLastSynced(date);
      await AsyncStorage.setItem(LAST_SYNC_KEY, date);
      Alert.alert("WHOOP", `Synced ${formatDateFriendly(date)}`);
    } catch (err: any) {
      const e = toAppError(err, "WHOOP sync failed.");
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
    await AsyncStorage.multiRemove([SESSION_KEY, LAST_SYNC_KEY]);
    setSessionToken(null);
    setConnected(false);
    setLastSynced(null);
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
    Alert.alert("Saved", `Wearable data saved for ${formatDateFriendly(selectedDate)}.`);
    setManualRecovery("");
    setManualSleep("");
    setManualStrain("");
  };

  return (
    <Screen scroll>
      <Text style={[styles.h1, { color: c.text.primary }]}>WHOOP</Text>
      <Text style={[styles.sub, { color: c.text.secondary }]}>
        Connect your WHOOP to bring in recovery, sleep, and strain — or type the numbers in yourself.
      </Text>

      {/* ── Inline consent prompt ── */}
      {showConsent && !consentGranted && (
        <GlassCard style={styles.card}>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>
            Allow WHOOP data access?
          </Text>
          <Text style={{ color: c.text.secondary, fontSize: 14, lineHeight: 20, marginTop: 8 }}>
            Life Balance Assistant will connect to your WHOOP account to read your recovery, sleep, and strain scores. This data is used only for your personal insights.
          </Text>
          <View style={{ marginTop: 10, padding: 12, borderRadius: BorderRadius.lg, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}>
            <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18 }}>
              • Recovery, sleep hours, and strain are read daily{"\n"}
              • Data stays on this device — nothing is shared{"\n"}
              • You can disconnect and clear data at any time
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: Spacing.sm }}>
            <GlassButton
              title="Allow and connect"
              variant="primary"
              onPress={grantConsentAndConnect}
              style={{ flex: 1 }}
            />
            <GlassButton
              title="Not now"
              variant="secondary"
              onPress={() => setShowConsent(false)}
              style={{ flex: 1 }}
            />
          </View>
        </GlassCard>
      )}

      {/* ── Connection card ── */}
      <GlassCard style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[styles.title, { color: c.text.primary }]}>Connection</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: connected ? "#34C759" : c.text.tertiary,
              }}
            />
            <Text style={{ color: connected ? "#34C759" : c.text.tertiary, fontWeight: "700", fontSize: 13 }}>
              {connected ? "Connected" : "Not connected"}
            </Text>
          </View>
        </View>

        {lastSynced ? (
          <Text style={{ color: c.text.secondary, marginTop: 8, fontSize: 13 }}>
            Last synced: {formatDateFriendly(lastSynced)}
          </Text>
        ) : null}

        <View style={{ marginTop: 12, gap: 8 }}>
          {!connected ? (
            <Button
              title={busy ? "Connecting…" : "Connect WHOOP"}
              onPress={startConnect}
              disabled={busy || !ready}
              accessibilityLabel="Connect WHOOP"
            />
          ) : (
            <>
              <Button
                title={busy ? "Syncing…" : "Sync today"}
                onPress={() => syncDate(today)}
                disabled={busy}
                accessibilityLabel="Sync today's WHOOP data"
              />
              <Button
                title="Disconnect"
                variant="secondary"
                onPress={disconnect}
                disabled={busy}
                accessibilityLabel="Disconnect WHOOP"
              />
            </>
          )}
        </View>
      </GlassCard>

      {/* ── Sync past dates (only when connected) ── */}
      {connected && (
        <GlassCard style={styles.card}>
          <Text style={[styles.title, { color: c.text.primary }]}>Sync a past date</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            <InsightsDatePicker
              date={selectedDate as any}
              onChange={(d) => setSelectedDate(d)}
              allowToday={true}
              title="Pick a date"
              helperText="Past dates only."
            />
            <Button
              title={busy ? "Syncing…" : `Sync ${formatDateFriendly(selectedDate)}`}
              onPress={() => syncDate(selectedDate)}
              disabled={busy}
              accessibilityLabel="Sync selected date"
            />
          </View>
        </GlassCard>
      )}

      {/* ── Manual entry ── */}
      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Type in numbers yourself</Text>
        <Text style={{ color: c.text.secondary, marginTop: 6, fontSize: 13, lineHeight: 18 }}>
          No WHOOP? No problem. Enter your recovery, sleep, and strain manually — same scoring pipeline.
        </Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          <TextInput
            value={manualRecovery}
            onChangeText={setManualRecovery}
            keyboardType="number-pad"
            placeholder="Recovery (0–100)"
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
            placeholder="Strain (optional, 0–21)"
            placeholderTextColor={c.text.tertiary}
            style={[styles.input, { borderColor: c.border.medium, color: c.text.primary }]}
          />
          <Button title={`Save for ${formatDateFriendly(selectedDate)}`} onPress={saveManual} accessibilityLabel="Save manual wearable data" />
        </View>
      </GlassCard>

      {/* ── Consent management ── */}
      {consentGranted && (
        <Pressable
          onPress={async () => {
            Alert.alert(
              "Withdraw WHOOP consent?",
              "This will disconnect your WHOOP and clear all stored tokens.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Withdraw",
                  style: "destructive",
                  onPress: async () => {
                    await disconnect();
                    await AsyncStorage.removeItem(CONSENT_KEY);
                    setConsentGranted(false);
                    Alert.alert("Done", "WHOOP consent withdrawn and data cleared.");
                  },
                },
              ],
            );
          }}
          style={{ paddingVertical: 12 }}
        >
          <Text style={{ color: c.text.tertiary, fontSize: 12, textAlign: "center" }}>
            Withdraw WHOOP consent
          </Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: "800" },
  sub: { marginTop: 6, marginBottom: 14 },
  card: { padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
