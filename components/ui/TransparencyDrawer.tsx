import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/tokens";
import { clearAll } from "@/lib/storage";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function TransparencyDrawer({ visible, onClose }: Props) {
  const t = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.glassOverlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.backgroundSecondary, borderColor: t.glassBorder }]}>
        <View style={styles.handle} />
        <Text style={{ color: t.textPrimary, fontWeight: "900", fontSize: 18 }}>How LBI is computed</Text>
        <Text style={[styles.body, { color: t.textMuted }]}>
          LBI blends recovery + sleep (objective) with mood + stress indicators (subjective). Strain only adds a penalty when
          high strain meets low recovery. Confidence drops when signals are missing. Correlation ≠ causation.
        </Text>
        <Text style={{ color: t.textPrimary, fontWeight: "900", fontSize: 18, marginTop: 12 }}>Data sources</Text>
        <Text style={[styles.body, { color: t.textMuted }]}>
          Wearable: WHOOP recovery, sleep, strain. Self-report: affect map, regulation, values, context tags. All stored locally
          on device; tokens stay on backend. No raw data sent to LLM—only small summaries.
        </Text>
        <Pressable
          onPress={async () => {
            await clearAll();
            onClose();
          }}
          style={[styles.delete, { borderColor: t.glassBorder, backgroundColor: t.glassOverlay }]}
          accessibilityLabel="Delete all local data"
        >
          <Text style={{ color: t.accentDanger, fontWeight: "800" }}>Delete all local data</Text>
        </Pressable>
        <Pressable onPress={onClose} style={[styles.close, { borderColor: t.glassBorder }]}>
          <Text style={{ color: t.textPrimary, fontWeight: "800" }}>Close</Text>
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
  delete: { marginTop: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  close: { marginTop: 10, padding: 12, borderWidth: 1, borderRadius: 14, alignItems: "center" },
});
