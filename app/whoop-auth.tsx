// app/whoop-auth.tsx
//
// WHOOP OAuth callback page for the web build.
//
// WHOOP redirects the browser back here with `?code=...&state=...` after the
// user authorises. Because expo-web-browser's openAuthSessionAsync can't be
// used cross-origin in production web, we drive the flow with a full-page
// navigation: the integration screen sets `whoop_oauth_state` in
// sessionStorage and redirects to WHOOP; WHOOP redirects back here; this
// component exchanges the code with the backend and forwards to home.
//
// On native this route is unreachable — native uses the deep-link redirect
// `lifebalanceapp://whoop-auth` handled inline inside the WHOOP screen.

import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Colors } from "@/constants/Colors";
import { upsertWearable } from "@/lib/storage";
import { refreshDerivedForDate } from "@/lib/pipeline";
import { todayISO } from "@/lib/util/todayISO";
import { getBackendBaseUrl } from "@/lib/backend";
import { resetTour, hasCompletedTour } from "@/lib/tour";

const SESSION_KEY = "whoop_session_token";
const LAST_SYNC_KEY = "whoop_last_sync";

export default function WhoopAuthCallback() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [status, setStatus] = useState<string>("Finishing WHOOP connection…");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // On native this screen should never be reached — bounce home.
    if (Platform.OS !== "web") {
      router.replace("/" as any);
      return;
    }

    const finish = async (msg: string, asError = false) => {
      if (asError) setErrorMsg(msg);
      else setStatus(msg);
      // Forward to home after a short pause so the user sees the result.
      setTimeout(() => router.replace("/" as any), asError ? 2200 : 600);
    };

    (async () => {
      try {
        if (typeof window === "undefined") {
          await finish("WHOOP connection only works in a browser.", true);
          return;
        }
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const stateParam = url.searchParams.get("state");
        const errParam = url.searchParams.get("error");
        const errDesc = url.searchParams.get("error_description");

        if (errParam) {
          console.warn("[WHOOP] OAuth error", errParam, errDesc);
          await finish(errDesc || errParam, true);
          return;
        }
        if (!code) {
          await finish("No authorization code received.", true);
          return;
        }

        const expected = sessionStorage.getItem("whoop_oauth_state");
        const participantId = sessionStorage.getItem("whoop_oauth_participant") || "";
        if (expected && stateParam && expected !== stateParam) {
          await finish("Auth state mismatch — please retry.", true);
          return;
        }

        const backendUrl = getBackendBaseUrl();
        if (!backendUrl) {
          await finish("Backend URL not configured.", true);
          return;
        }

        const redirectUri = `${window.location.origin}/whoop-auth`;
        console.log("[WHOOP] callback exchanging code", { redirectUri });

        const res = await fetch(`${backendUrl}/whoop/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirectUri, participantId }),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          await finish(`Token exchange failed: ${(errJson as any)?.error || res.status}`, true);
          return;
        }
        const json = (await res.json()) as any;
        if (!json?.sessionToken) {
          await finish("No session token returned by backend.", true);
          return;
        }
        await AsyncStorage.setItem(SESSION_KEY, json.sessionToken);

        // Optimistic same-day sync (best-effort, never blocks navigation).
        try {
          const today = todayISO();
          const syncRes = await fetch(`${backendUrl}/whoop/day?date=${encodeURIComponent(today)}`, {
            headers: { Authorization: `Bearer ${json.sessionToken}` },
          });
          if (syncRes.ok) {
            const syncJson = (await syncRes.json()) as any;
            if (syncJson?.data) {
              await upsertWearable(today as any, syncJson.data, "whoop_export");
              await refreshDerivedForDate(today as any);
              await AsyncStorage.setItem(LAST_SYNC_KEY, today);
            }
          }
        } catch (e) {
          console.warn("[WHOOP] post-connect sync failed", e);
        }

        // If the guided tour hasn't been seen, reset it so home triggers it.
        try {
          const tourDone = await hasCompletedTour();
          if (!tourDone) await resetTour();
        } catch {}

        sessionStorage.removeItem("whoop_oauth_state");
        sessionStorage.removeItem("whoop_oauth_participant");
        await finish("Connected!");
      } catch (err: any) {
        console.error("[WHOOP] callback error", err);
        await finish(err?.message ?? "WHOOP connection failed.", true);
      }
    })();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.accent.primary} />
      <Text style={[styles.title, { color: c.text.primary }]}>WHOOP</Text>
      <Text style={[styles.body, { color: errorMsg ? c.warning : c.text.secondary }]}>
        {errorMsg ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", marginTop: 8 },
  body: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
