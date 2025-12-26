import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { saveCheckIn } from "../../lib/storage";

type Rating = 1 | 2 | 3 | 4 | 5;

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Rating;
  onChange: (v: Rating) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pills}>
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n as Rating)}
              style={[styles.pill, selected && styles.pillSelected]}
            >
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function CheckInScreen() {
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [mood, setMood] = useState<Rating>(3);
  const [stress, setStress] = useState<Rating>(3);
  const [energy, setEnergy] = useState<Rating>(3);
  const [notes, setNotes] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Check-in</Text>
      <Text style={styles.subtitle}>Today: {todayKey}</Text>

      <View style={styles.card}>
        <RatingRow label="Mood" value={mood} onChange={setMood} />
        <RatingRow label="Stress" value={stress} onChange={setStress} />
        <RatingRow label="Energy" value={energy} onChange={setEnergy} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything that affected today?"
          placeholderTextColor="#64748b"
          style={styles.input}
          multiline
        />
      </View>

      <TouchableOpacity
  style={styles.button}
  onPress={async () => {
    await saveCheckIn({
      date: todayKey,
      mood,
      stress,
      energy,
      notes: notes.trim() || undefined,
    });
    Alert.alert("Saved", "Your check-in was saved for today.");
  }}
>
  <Text style={styles.buttonText}>Save Check-in</Text>
</TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0f172a" },
  title: { fontSize: 28, fontWeight: "600", color: "#f8fafc" },
  subtitle: { marginTop: 6, marginBottom: 18, color: "#94a3b8" },
  card: { backgroundColor: "#020617", padding: 18, borderRadius: 16, marginBottom: 14 },
  row: { marginBottom: 14 },
  label: { color: "#94a3b8", marginBottom: 10, fontSize: 14 },
  pills: { flexDirection: "row", gap: 10 },
  pill: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b1220",
    borderWidth: 1,
    borderColor: "#1f2a44",
  },
  pillSelected: { backgroundColor: "#38bdf8", borderColor: "#38bdf8" },
  pillText: { color: "#e5e7eb", fontWeight: "600" },
  pillTextSelected: { color: "#001018" },
  input: {
    minHeight: 90,
    color: "#e5e7eb",
    backgroundColor: "#0b1220",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1f2a44",
  },
  button: { marginTop: 8, backgroundColor: "#38bdf8", padding: 16, borderRadius: 14 },
  buttonText: { textAlign: "center", fontWeight: "700", color: "#001018", fontSize: 16 },
});
