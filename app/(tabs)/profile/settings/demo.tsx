import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import {
  clearDemoOverrides,
  isDemoEnabled,
  setDemoCheckIn,
  setDemoEnabled,
  setDemoWearable,
} from "@/lib/demo";
import { SCENARIOS, seedScenario, type ScenarioKey } from "@/lib/demoScenarios";
import { confirmDestructive, notify } from "@/lib/util/confirm";

// "Seed 30 days demo data" used to wipe the local store and write
// 30 days of randomised data via seedDemoData(). The user-facing
// behaviour we now want is: pressing the button opens a scenario
// picker; the chosen scenario seeds 14 deterministic days *and*
// flips Demo Mode on so the rest of the app shows the seeded badge.
// 30-day random seeding has been retired because nothing in the app
// surfaced day 15+ uniquely, and the deterministic 14-day arcs are
// what every viva walkthrough actually uses.

export default function DemoToolsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [demoOn, setDemoOn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Re-read the demo flag whenever the screen mounts or after an
  // operation, so the pill always matches what's actually persisted.
  const refreshDemoFlag = async () => {
    const on = await isDemoEnabled();
    setDemoOn(on);
  };

  useEffect(() => {
    refreshDemoFlag();
  }, []);

  const toggleDemo = async () => {
    setSaving(true);
    try {
      const next = !demoOn;
      await setDemoEnabled(next);
      setDemoOn(next);
    } finally {
      setSaving(false);
    }
  };

  // The big "Seed 30 days demo data" button now opens the scenario
  // picker. The label is preserved for continuity, but the action is
  // "choose a preset, seed it, turn Demo Mode on".
  const onOpenScenarioPicker = () => {
    setPickerOpen(true);
  };

  const onPickScenario = async (key: ScenarioKey, title: string) => {
    setPickerOpen(false);
    const ok = await confirmDestructive(
      `Load "${title}"?`,
      "This wipes the current local data and replaces it with 14 days of scenario example data. Demo Mode will be turned on. This cannot be undone.",
      "Load scenario",
    );
    if (!ok) return;
    setSaving(true);
    try {
      await seedScenario(key);
      // Auto-flip Demo Mode on so the seeded data is honoured by the
      // rest of the app immediately — no extra tap required.
      await setDemoEnabled(true);
      await refreshDemoFlag();
      notify(
        "Scenario loaded",
        `Seeded 14 days for "${title}" and turned Demo Mode on. Open Home, Insights, or History to see the data.`,
      );
    } catch (err) {
      notify("Couldn't seed scenario", (err as any)?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const onClearOverrides = async () => {
    const ok = await confirmDestructive(
      "Clear demo overrides?",
      "Removes the temporary check-in and wearable values used for demos and turns Demo Mode off. Your real check-in and wearable data is unaffected.",
      "Clear",
    );
    if (!ok) return;
    setSaving(true);
    try {
      await clearDemoOverrides();
      // Turning Demo Mode off is the natural pair: clearing the
      // overrides without flipping the flag would leave the rest of
      // the app showing a "Demo data" badge with no demo to back it.
      await setDemoEnabled(false);
      await refreshDemoFlag();
      notify("Done", "Cleared demo overrides and turned Demo Mode off.");
    } catch (err: any) {
      notify("Clear failed", err?.message ?? "Could not clear overrides.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll contentStyle={styles.container}>
      <ScreenHeader
        title="Demo tools"
        subtitle="Load example data so you can see how the app looks once a few days are filled in."
      />

      <GlassCard>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: c.text.primary }]}>Demo mode</Text>
            <Text style={[styles.rowSub, { color: c.text.secondary }]}>Uses seeded data + predictable outputs.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Demo mode ${demoOn ? "on" : "off"}`}
            onPress={toggleDemo}
            disabled={saving}
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: demoOn ? c.accent.primary : c.glass.primary, borderColor: c.border.medium },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.pillText, { color: demoOn ? c.onPrimary : c.text.primary }]}>
              {demoOn ? "On" : "Off"}
            </Text>
          </Pressable>
        </View>
      </GlassCard>

      <GlassCard style={styles.cardPad}>
        <Pressable
          onPress={onOpenScenarioPicker}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Seed 30 days of demo data"
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: c.accent.primary, opacity: saving ? 0.6 : 1 },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.primaryText, { color: c.onPrimary }]}>
            {saving ? "Working…" : "Seed 30 days demo data"}
          </Text>
        </Pressable>
        <Text style={[styles.helper, { color: c.text.tertiary }]}>
          Pick a scenario preset (Healthy week, Stress spike, Burnout → recovery, etc.). The chosen
          preset seeds 14 deterministic days and turns Demo Mode on.
        </Text>
        <View style={{ height: 12 }} />
        <Pressable
          onPress={async () => {
            setSaving(true);
            try {
              await setDemoWearable({ sleepHours: 7.4, recovery: 78, hrv: 58, restingHR: 54 });
              notify("Done", "Set demo wearable values.");
            } catch (err: any) {
              notify("Couldn't set wearable", err?.message ?? "Unknown error");
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryBtn, { borderColor: c.border.medium }, pressed && styles.pressed]}
        >
          <Text style={[styles.secondaryText, { color: c.text.primary }]}>Set demo wearable values</Text>
        </Pressable>
        <View style={{ height: 12 }} />
        <Pressable
          onPress={async () => {
            setSaving(true);
            try {
              await setDemoCheckIn({
                mood: 3,
                energy: 3,
                stressLevel: 3,
                sleepQuality: 3,
                stressIndicators: {
                  muscleTension: false,
                  racingThoughts: false,
                  irritability: false,
                  avoidance: false,
                  restlessness: false,
                },
                caffeineAfter2pm: false,
                alcohol: false,
                exerciseDone: true,
                deepWorkMins: 45,
                hydrationLitres: 2,
                notes: "Demo check-in",
              });
              notify("Done", "Set demo check-in values.");
            } catch (err: any) {
              notify("Couldn't set check-in", err?.message ?? "Unknown error");
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryBtn, { borderColor: c.border.medium }, pressed && styles.pressed]}
        >
          <Text style={[styles.secondaryText, { color: c.text.primary }]}>Set demo check-in values</Text>
        </Pressable>
        <View style={{ height: 12 }} />
        <Pressable
          onPress={onClearOverrides}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Clear demo overrides and turn Demo Mode off"
          style={({ pressed }) => [styles.secondaryBtn, { borderColor: c.border.medium }, pressed && styles.pressed]}
        >
          <Text style={[styles.secondaryText, { color: c.text.primary }]}>Clear demo overrides</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.cardPad}>
        <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Scenario presets</Text>
        <Text style={[styles.sectionSub, { color: c.text.secondary }]}>
          Each option clears your current data and replaces it with 14 days of example data telling a different story. Handy for exploring what the app looks like in different situations.
        </Text>
        <View style={{ height: 12 }} />
        {SCENARIOS.map((s, idx) => (
          <View key={s.key}>
            {idx > 0 && <View style={{ height: 10 }} />}
            <Pressable
              onPress={() => onPickScenario(s.key, s.title)}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={`Load scenario: ${s.title}`}
              style={({ pressed }) => [
                styles.scenarioBtn,
                { borderColor: c.border.medium },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.scenarioTitle, { color: c.text.primary }]}>{s.title}</Text>
              <Text style={[styles.scenarioBlurb, { color: c.text.secondary }]}>{s.blurb}</Text>
            </Pressable>
          </View>
        ))}
      </GlassCard>

      {/* Cross-platform scenario picker. Native Alert with N choices is
          unreliable on iOS (3-button cap) and a no-op on web — a Modal
          gives us identical behaviour everywhere. */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: c.background, borderColor: c.border.medium }]}>
            <Text style={[styles.modalTitle, { color: c.text.primary }]}>Choose a scenario</Text>
            <Text style={[styles.modalSub, { color: c.text.secondary }]}>
              Pick the story you want the demo data to tell. Loading a scenario clears the current local data.
            </Text>
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingVertical: 8 }}>
              {SCENARIOS.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => onPickScenario(s.key, s.title)}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel={`Load scenario: ${s.title}`}
                  style={({ pressed }) => [
                    styles.modalRow,
                    { borderColor: c.border.medium },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.modalRowTitle, { color: c.text.primary }]}>{s.title}</Text>
                  <Text style={[styles.modalRowBlurb, { color: c.text.secondary }]}>{s.blurb}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setPickerOpen(false)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.modalCancel,
                { borderColor: c.border.medium },
                pressed && styles.pressed,
              ]}
            >
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 14 }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 28, fontWeight: "800" },
  sub: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  rowSub: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
  },
  pillText: { fontSize: 13, fontWeight: "700" },
  cardPad: { padding: 16 },
  primaryBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  helper: { marginTop: 8, fontSize: 12, lineHeight: 17 },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  secondaryText: { fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.85 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  sectionSub: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  scenarioBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "flex-start",
  },
  scenarioTitle: { fontSize: 15, fontWeight: "800" },
  scenarioBlurb: { marginTop: 4, fontSize: 12, lineHeight: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 460,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.2 },
  modalSub: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  modalRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 6,
  },
  modalRowTitle: { fontSize: 15, fontWeight: "800" },
  modalRowBlurb: { marginTop: 4, fontSize: 12, lineHeight: 16 },
  modalCancel: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
});
