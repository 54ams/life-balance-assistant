// app/(tabs)/profile/integrations/whoop.tsx
//
// WHOOP integration screen — connect, sync, and manage the wearable.
//
// I structured this screen as the user-facing wrapper around three
// pieces of plumbing:
//   - The OAuth flow (deep-link on native, full-page on web; the
//     web callback lands at /whoop-auth which exchanges the code).
//   - The session token kept in AsyncStorage under SESSION_KEY.
//     The token is opaque — it identifies a row on the backend that
//     holds the real WHOOP refresh token.
//   - lib/whoopSync.ts which does the actual day pulls, retry, and
//     local upsert.
//
// Demo mode: I include an "activate demo data" path so the viva can
// proceed even without a band on hand. Demo data is clearly labelled
// (wearableSource = "whoop_demo") so it cannot be confused with
// real data on the explain screen or in any export.
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { hasCompletedTour, resetTour } from "@/lib/tour";

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
import { getBackendBaseUrl, getWhoopWebRedirectUri } from "@/lib/backend";
import { formatDateFriendly } from "@/lib/util/formatDate";
import {
  activateDemoWhoop,
  deactivateDemoWhoop,
  isDemoWhoopActive,
  WHOOP_DEMO_DAYS,
} from "@/lib/demoWhoop";
import { confirmDestructive, notify } from "@/lib/util/confirm";

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
  const [demoActive, setDemoActive] = useState(false);
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
      setDemoActive(await isDemoWhoopActive());
      const days = await getWearableDays();
      const recentWhoop = days.filter((d) => String(d.source).startsWith("whoop"));
      setWhoopDaysLast7(recentWhoop.slice(-7).length);
    })();
  }, []);

  // Platform-aware OAuth redirect URI:
  //  - native: app deep link handled by expo-web-browser
  //  - web: a fixed canonical URL pre-registered with WHOOP
  //
  // WHOOP enforces exact-match against the redirect URIs registered in
  // its developer dashboard, so we MUST NOT derive the production web
  // URI from `window.location.origin` — Vercel preview deploys (e.g.
  // life-balance-assistant-git-*.vercel.app) and any other origin would
  // cause a `redirect_uri mismatch`. The canonical URL is centralised
  // in `getWhoopWebRedirectUri()` so the authorize step and the token
  // exchange in `app/whoop-auth.tsx` always agree.
  const redirectUri = useMemo(() => {
    if (Platform.OS === "web") return getWhoopWebRedirectUri();
    return "lifebalanceapp://whoop-auth";
  }, []);
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
      notify("WHOOP", "Client ID not configured.");
      return;
    }
    if (!backendUrl) {
      notify("WHOOP", "WHOOP connection is unavailable in this build.");
      return;
    }
    const state = randomId() + randomId();
    const authUrl = `${WHOOP_AUTH_URL}?client_id=${encodeURIComponent(
      process.env.EXPO_PUBLIC_WHOOP_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(WHOOP_SCOPES)}&state=${encodeURIComponent(state)}`;

    if (__DEV__) {
      // Diagnostic only — never log secrets, tokens, codes, or PII.
      console.log("[WHOOP] authorize redirect_uri:", redirectUri);
      console.log("[WHOOP] backend URL:", backendUrl);
      console.log("[WHOOP] platform:", Platform.OS);
    }

    // On web we cannot use openAuthSessionAsync (cross-origin popup is blocked
    // and WHOOP enforces strict redirect_uri matching). Do a full-page nav
    // and let /whoop-auth resume via the persisted state below.
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("whoop_oauth_state", state);
          sessionStorage.setItem("whoop_oauth_participant", participantId ?? "");
          window.location.assign(authUrl);
        }
      } catch (err: any) {
        notify("WHOOP", `Failed to start auth: ${err?.message ?? "unknown"}`);
      }
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    if (result.type !== "success" || !result.url) {
      notify("WHOOP", "Authentication was cancelled or failed.");
      return;
    }

    const params = new URL(result.url).searchParams;
    const error = params.get("error");
    if (error) {
      const desc = params.get("error_description") || error;
      notify("WHOOP", `Auth error: ${desc}`);
      return;
    }
    const code = params.get("code");
    if (!code) {
      notify("WHOOP", `No authorization code received.\n\nRedirect: ${result.url}`);
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
      let connectMessage = "Connected! Sync will be available shortly.";
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
            connectMessage = `Connected and synced ${formatDateFriendly(todayDate)}.`;
          } else {
            connectMessage =
              "Connected! No data for today yet — your cycle may not have completed. Try syncing later or sync a past date.";
          }
        } else {
          const errJson = await syncRes.json().catch(() => ({}));
          connectMessage = `Connected, but sync failed: ${(errJson as any)?.error || syncRes.status}`;
        }
      } catch {
        connectMessage = "Connected! Sync will be available shortly.";
      }
      // Drop the user back at Home and re-trigger the guided tour if they
      // haven't seen it yet — onboarding flows here from first-run, so the
      // natural next moment is "show them what they just unlocked".
      const tourDone = await hasCompletedTour();
      if (!tourDone) {
        await resetTour();
      }
      Alert.alert("WHOOP", connectMessage, [
        {
          text: "OK",
          onPress: () => {
            router.replace("/" as any);
          },
        },
      ]);
    } catch (err: any) {
      const e = toAppError(err, "Failed to connect WHOOP.");
      // Offer a graceful fallback so the user is never stuck — they can retry
      // the OAuth flow or fall back to the labelled demo data path.
      Alert.alert(
        "WHOOP",
        `${e.userMessage}\n\nYou can try again, or continue with simulated WHOOP-shaped data so the rest of the app still works.`,
        [
          { text: "Try again", onPress: () => doConnect() },
          { text: "Use demo data", onPress: () => useDemoWhoop() },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } finally {
      setBusy(false);
    }
  };

  const syncDate = async (date: string) => {
    if (date > todayISO()) {
      notify("WHOOP", "Future dates are not allowed.");
      return;
    }
    if (!sessionToken || !backendUrl) {
      notify("WHOOP", "Not connected yet.");
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
      notify("WHOOP", `Synced ${formatDateFriendly(date)}`);
    } catch (err: any) {
      const e = toAppError(err, "WHOOP sync failed.");
      notify("WHOOP", e.userMessage);
    } finally {
      setBusy(false);
    }
  };

  const today = todayISO();

  const disconnect = async () => {
    if (!sessionToken) return;
    setBusy(true);
    try {
      if (backendUrl) {
        try {
          await fetch(`${backendUrl}/whoop/session`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${sessionToken}` },
          });
        } catch {
          /* non-fatal — token still cleared locally */
        }
      }
      await AsyncStorage.multiRemove([SESSION_KEY, LAST_SYNC_KEY]);
      setSessionToken(null);
      setConnected(false);
      setLastSynced(null);
      // Without a notification a successful disconnect looks identical
      // to a no-op tap, which is the bug the user reported. The visible
      // state change (badge → "Not connected") is still the primary cue
      // but a confirmation message removes the ambiguity on web where
      // the badge re-paint can lag behind the tap.
      notify("WHOOP", "Disconnected. Local WHOOP session was cleared.");
    } catch (err: any) {
      notify("WHOOP", err?.message ?? "Could not disconnect.");
    } finally {
      setBusy(false);
    }
  };

  const useDemoWhoop = async () => {
    setBusy(true);
    try {
      const result = await activateDemoWhoop();
      setDemoActive(true);
      setLastSynced(result.lastDate);
      notify(
        "Demo WHOOP",
        `Seeded ${result.daysSeeded} days of simulated WHOOP-shaped data (${formatDateFriendly(result.firstDate)} — ${formatDateFriendly(result.lastDate)}). The app now treats this as wearable input for LBI, plan, history, ML risk, and exports. Provenance is recorded as "WHOOP (demo)".`,
      );
    } catch (err: any) {
      notify("Demo WHOOP", err?.message ?? "Failed to seed demo WHOOP data.");
    } finally {
      setBusy(false);
    }
  };

  const stopDemoWhoop = async () => {
    await deactivateDemoWhoop();
    setDemoActive(false);
    notify(
      "Demo WHOOP",
      "Demo flag cleared. Existing demo days remain on the device tagged as 'WHOOP (demo)'. Use Profile → Settings → Data → Purge now to remove them entirely.",
    );
  };

  const saveManual = async () => {
    const recovery = Number(manualRecovery);
    const sleepHours = Number(manualSleep);
    const strain = manualStrain.trim() ? Number(manualStrain) : undefined;
    if (!Number.isFinite(recovery) || recovery < 0 || recovery > 100) {
      notify("Manual entry", "Recovery must be between 0 and 100.");
      return;
    }
    if (!Number.isFinite(sleepHours) || sleepHours <= 0 || sleepHours > 14) {
      notify("Manual entry", "Sleep hours must be between 0 and 14.");
      return;
    }
    if (strain != null && (!Number.isFinite(strain) || strain < 0 || strain > 21)) {
      notify("Manual entry", "Strain must be between 0 and 21.");
      return;
    }
    await upsertWearable(selectedDate as any, { recovery, sleepHours, strain }, "simulated_stub");
    await refreshDerivedForDate(selectedDate as any);
    notify("Saved", `Wearable data saved for ${formatDateFriendly(selectedDate)}.`);
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
          <View style={{ marginTop: 10, padding: 12, borderRadius: BorderRadius.lg, backgroundColor: "rgba(0,0,0,0.03)" }}>
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
                onPress={async () => {
                  const ok = await confirmDestructive(
                    "Disconnect WHOOP?",
                    "Clears the local WHOOP session token. Your synced records stay on the device. You can reconnect at any time.",
                    "Disconnect",
                  );
                  if (!ok) return;
                  await disconnect();
                }}
                disabled={busy}
                accessibilityLabel="Disconnect WHOOP"
              />
            </>
          )}
        </View>
      </GlassCard>

      {/* ── Demo WHOOP (for markers / no-device evaluation) ── */}
      <GlassCard style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[styles.title, { color: c.text.primary }]}>Demo WHOOP data</Text>
          {demoActive && (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: "rgba(255,149,0,0.15)",
              }}
              accessibilityLabel="Demo WHOOP data is active"
            >
              <Text style={{ color: "#FF9500", fontWeight: "700", fontSize: 11 }}>DEMO ACTIVE</Text>
            </View>
          )}
        </View>
        <Text style={{ color: c.text.secondary, marginTop: 6, fontSize: 13, lineHeight: 18 }}>
          For markers and supervisors without a WHOOP account. Seeds {WHOOP_DEMO_DAYS} days of
          realistic simulated recovery, sleep, and strain through the same wearable pipeline the
          live integration uses. Data is clearly labelled as <Text style={{ fontWeight: "700" }}>WHOOP (demo)</Text> in
          insights, transparency, and exports — it is never presented as live data.
        </Text>
        <View style={{ marginTop: 10, gap: 8 }}>
          {!demoActive ? (
            <Button
              title={busy ? "Seeding…" : `Use ${WHOOP_DEMO_DAYS}-day demo WHOOP data`}
              onPress={useDemoWhoop}
              disabled={busy}
              accessibilityLabel="Activate demo WHOOP data"
            />
          ) : (
            <Button
              title="Clear demo flag"
              variant="secondary"
              onPress={stopDemoWhoop}
              disabled={busy}
              accessibilityLabel="Clear demo WHOOP flag"
            />
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
            style={[styles.input, { borderColor: "rgba(44,54,42,0.25)", color: c.text.primary }]}
          />
          <TextInput
            value={manualSleep}
            onChangeText={setManualSleep}
            keyboardType="decimal-pad"
            placeholder="Sleep hours"
            placeholderTextColor={c.text.tertiary}
            style={[styles.input, { borderColor: "rgba(44,54,42,0.25)", color: c.text.primary }]}
          />
          <TextInput
            value={manualStrain}
            onChangeText={setManualStrain}
            keyboardType="decimal-pad"
            placeholder="Strain (optional, 0–21)"
            placeholderTextColor={c.text.tertiary}
            style={[styles.input, { borderColor: "rgba(44,54,42,0.25)", color: c.text.primary }]}
          />
          <Button title={`Save for ${formatDateFriendly(selectedDate)}`} onPress={saveManual} accessibilityLabel="Save manual wearable data" />
        </View>
      </GlassCard>

      {/* ── Consent management ── */}
      {consentGranted && (
        <Pressable
          onPress={async () => {
            const ok = await confirmDestructive(
              "Withdraw WHOOP consent?",
              "This will disconnect your WHOOP and clear all stored tokens.",
              "Withdraw",
            );
            if (!ok) return;
            try {
              await disconnect();
              await AsyncStorage.removeItem(CONSENT_KEY);
              setConsentGranted(false);
              notify("Done", "WHOOP consent withdrawn and data cleared.");
            } catch (err: any) {
              notify("Withdraw failed", err?.message ?? "Could not withdraw consent. Please try again.");
            }
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
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
});
