import React from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import { clearAll } from "@/lib/storage";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function TransparencyDrawer({ visible, onClose }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const glassOverlay = "rgba(0,0,0,0.10)";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: glassOverlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.backgroundSecondary, borderColor: c.glass.border }]}>
        <View style={styles.handle} />
        <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 18 }}>How LBI is computed</Text>
        <Text style={[styles.body, { color: c.text.tertiary }]}>
          LBI blends recovery + sleep (objective) with mood + stress indicators (subjective). Strain only adds a penalty when
          high strain meets low recovery. Confidence drops when signals are missing. Correlation ≠ causation.
        </Text>
        <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 18, marginTop: 12 }}>Data sources</Text>
        <Text style={[styles.body, { color: c.text.tertiary }]}>
          Wearable: WHOOP recovery, sleep, strain. Self-report: affect map, regulation, values, context tags. All stored locally
          on device; tokens stay on backend. No raw data sent to LLM—only small summaries.
        </Text>
        <Pressable
          onPress={() => {
            Alert.alert(
              "Delete all data",
              "This will permanently remove all check-ins, plans, wearable data, and settings. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete everything",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await clearAll();
                      onClose();
                    } catch {
                      Alert.alert("Error", "Could not delete data. Please try again.");
                    }
                  },
                },
              ]
            );
          }}
          style={[styles.delete, { borderColor: c.glass.border, backgroundColor: glassOverlay }]}
          accessibilityLabel="Delete all local data"
        >
          <Text style={{ color: c.danger, fontWeight: "800" }}>Delete all local data</Text>
        </Pressable>
        <Pressable onPress={onClose} style={[styles.close, { borderColor: c.glass.border }]}>
          <Text style={{ color: c.text.primary, fontWeight: "800" }}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  handle: {
    width: 50,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  body: { marginTop: 4, lineHeight: 18 },
  delete: { marginTop: 12, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: "center" },
  close: { marginTop: 10, padding: 12, borderWidth: 1, borderRadius: 14, alignItems: "center" },
});
