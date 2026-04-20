import React from "react";
import { Stack } from "expo-router";

export default function HistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: "ios_from_right",
      }}
    />
  );
}
