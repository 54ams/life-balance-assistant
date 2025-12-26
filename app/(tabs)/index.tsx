import { StyleSheet, Text, View } from "react-native";

export default function TodayScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Life Balance</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Life Balance Index</Text>
        <Text style={styles.score}>72</Text>
        <Text style={styles.reason}>
          Recovery is moderate and mood is stable.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Today’s Focus</Text>
        <Text style={styles.action}>
          Light training + one important task only.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0f172a",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#f8fafc",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#020617",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 8,
  },
  score: {
    fontSize: 48,
    fontWeight: "700",
    color: "#38bdf8",
  },
  reason: {
    fontSize: 16,
    color: "#e5e7eb",
    marginTop: 8,
  },
  action: {
    fontSize: 18,
    fontWeight: "500",
    color: "#a7f3d0",
  },
});
