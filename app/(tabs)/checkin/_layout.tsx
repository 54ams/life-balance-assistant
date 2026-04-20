import { Stack } from "expo-router";
import React, { useState, useEffect } from "react";

export default function CheckInLayout() {
  // Brief loading guard to ensure the tab mounts cleanly before rendering children.
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: "fade_from_bottom",
        animationDuration: 200,
      }}
    />
  );
}
