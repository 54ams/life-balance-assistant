import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AuroraBackground } from "@/components/ui/AuroraBackground";

type WearableDevice = {
  id: string;
  name: string;
  icon: string;
  status: "connected" | "coming_soon" | "available";
  description: string;
  route?: string;
};

const DEVICES: WearableDevice[] = [
  {
    id: "whoop",
    name: "WHOOP",
    icon: "heart.circle.fill",
    status: "available",
    description: "Recovery, sleep, and strain tracking. Full integration.",
    route: "/profile/integrations/whoop",
  },
  {
    id: "apple_watch",
    name: "Apple Watch",
    icon: "applewatch",
    status: "coming_soon",
    description: "Heart rate, activity rings, sleep, and mindfulness minutes.",
  },
  {
    id: "garmin",
    name: "Garmin",
    icon: "figure.run",
    status: "coming_soon",
    description: "Body Battery, stress, sleep score, and activity data.",
  },
  {
    id: "fitbit",
    name: "Fitbit",
    icon: "waveform.path.ecg",
    status: "coming_soon",
    description: "Daily readiness, sleep stages, stress management score.",
  },
  {
    id: "oura",
    name: "Oura Ring",
    icon: "circle.circle.fill",
    status: "coming_soon",
    description: "Readiness, sleep quality, activity goals, and temperature.",
  },
  {
    id: "samsung",
    name: "Samsung Health",
    icon: "heart.text.square.fill",
    status: "coming_soon",
    description: "Sleep, stress, body composition, and heart rate data.",
  },
];

export default function WearablesHubScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground state="neutral" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <IconSymbol name="chevron.left" size={20} color={c.text.primary} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: c.text.primary }]}>Connect Wearables</Text>
              <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                Bring your body data into the picture
              </Text>
            </View>
          </View>

          {/* Explanation */}
          <GlassCard style={{ marginTop: Spacing.lg }} padding="base">
            <Text style={{ color: c.text.secondary, fontSize: 14, lineHeight: 20 }}>
              Wearable data adds the physiological side of your Mind-Body Bridge — recovery, sleep quality,
              and strain. Combined with your check-ins, the app can show how your body and mind relate.
            </Text>
          </GlassCard>

          {/* Device list */}
          <View style={{ marginTop: Spacing.xl, gap: Spacing.md }}>
            <Text style={[styles.sectionLabel, { color: c.text.tertiary }]}>DEVICES</Text>
            {DEVICES.map((device) => (
              <Pressable
                key={device.id}
                onPress={() => {
                  if (device.route) router.push(device.route as any);
                }}
                disabled={device.status === "coming_soon"}
                style={({ pressed }) => [pressed && device.route && { opacity: 0.8 }]}
              >
                <GlassCard padding="base">
                  <View style={styles.deviceRow}>
                    <View
                      style={[
                        styles.deviceIcon,
                        {
                          backgroundColor:
                            device.status === "coming_soon"
                              ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)")
                              : c.accent.primary + "18",
                        },
                      ]}
                    >
                      <IconSymbol
                        name={device.icon as any}
                        size={22}
                        color={device.status === "coming_soon" ? c.text.tertiary : c.accent.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={[styles.deviceName, { color: c.text.primary }]}>{device.name}</Text>
                        {device.status === "coming_soon" && (
                          <View style={[styles.badge, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
                            <Text style={[styles.badgeText, { color: c.text.tertiary }]}>Coming Soon</Text>
                          </View>
                        )}
                        {device.status === "connected" && (
                          <View style={[styles.badge, { backgroundColor: "#10b98120" }]}>
                            <Text style={[styles.badgeText, { color: "#10b981" }]}>Connected</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.deviceDesc, { color: c.text.secondary }]}>
                        {device.description}
                      </Text>
                    </View>
                    {device.route && (
                      <IconSymbol name="chevron.right" size={16} color={c.text.tertiary} />
                    )}
                  </View>
                </GlassCard>
              </Pressable>
            ))}
          </View>

          {/* Bottom note */}
          <Text style={{ color: c.text.tertiary, fontSize: 12, textAlign: "center", marginTop: Spacing.xl, lineHeight: 18 }}>
            More devices are on the way. Your data always stays on this device — wearable sync happens locally.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "700",
  },
  deviceDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
