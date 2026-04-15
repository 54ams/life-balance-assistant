import React from "react";
import { Modal, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { GlassCard } from "./GlassCard";
import { StatPill } from "./StatPill";
import { Colors } from "@/constants/Colors";
import { Button } from "./button";
import { router } from "expo-router";

type Driver = { label: string; value: string };

export function DriverOverlay({
  visible,
  onClose,
  drivers,
}: {
  visible: boolean;
  onClose: () => void;
  drivers: Driver[];
}) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const glassOverlay = isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.10)";

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: glassOverlay }]} onPress={onClose} />
      <View style={styles.center}>
        <GlassCard style={styles.card}>
          <Text style={{ color: c.text.primary, fontSize: 18, fontWeight: "800" }}>Top drivers</Text>
          <View style={{ marginTop: 12, gap: 8 }}>
            {drivers.map((d, i) => (
              <StatPill key={i} label={d.label} value={d.value} />
            ))}
          </View>
          <View style={{ marginTop: 14 }}>
            <Button title="See full breakdown" variant="primary" onPress={() => router.push("/insights/explain" as any)} />
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%" },
});
