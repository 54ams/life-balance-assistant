import React from "react";
import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { getAppConsent } from "@/lib/privacy";

export default function InsightsLayout() {
  const [ready, setReady] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  useEffect(() => {
    (async () => {
      const consent = await getAppConsent();
      setHasConsent(!!consent);
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  if (!hasConsent) return <Redirect href="/profile/settings/consent" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: "slide_from_right",
      }}
    />
  );
}
