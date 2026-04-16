import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { clearAll } from "@/lib/storage";
import { seedDemo } from "@/lib/demo";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string; resetting: boolean };

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "", resetting: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Unexpected error", resetting: false };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) console.error("App boundary:", error.message);
  }

  reset = () => {
    this.setState({ hasError: false, message: "", resetting: false });
  };

  resetDemo = async () => {
    this.setState({ resetting: true });
    try {
      await clearAll();
      await seedDemo(14);
      this.setState({ hasError: false, message: "", resetting: false });
    } catch (e: any) {
      Alert.alert("Reset failed", e?.message ?? "Could not reset demo data.");
      this.setState({ resetting: false });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <BoundaryFallback
        message={this.state.message}
        resetting={this.state.resetting}
        onRetry={this.reset}
        onResetDemo={this.resetDemo}
      />
    );
  }
}

function BoundaryFallback({
  message,
  resetting,
  onRetry,
  onResetDemo,
}: {
  message: string;
  resetting: boolean;
  onRetry: () => void;
  onResetDemo: () => void;
}) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: c.background }}>
      <Text style={{ color: c.text.primary, fontSize: 20, fontWeight: "800" }}>Something went wrong</Text>
      <Text style={{ color: c.text.secondary, marginTop: 8, textAlign: "center" }}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={{
          marginTop: 18,
          borderRadius: 999,
          paddingHorizontal: 20,
          paddingVertical: 12,
          backgroundColor: c.accent.primary,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Try again</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          Alert.alert(
            "Reset demo data?",
            "This will clear all local data and reseed a 14-day demo set. Use this if you need to recover quickly during a demo.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Reset demo", style: "destructive", onPress: onResetDemo },
            ]
          );
        }}
        disabled={resetting}
        style={{
          marginTop: 12,
          borderRadius: 999,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderWidth: 1.5,
          borderColor: c.border.medium,
          opacity: resetting ? 0.5 : 1,
        }}
      >
        <Text style={{ color: c.text.primary, fontWeight: "700" }}>
          {resetting ? "Resetting…" : "Reset demo data"}
        </Text>
      </Pressable>
      <Text style={{ color: c.text.tertiary, marginTop: 14, fontSize: 12, textAlign: "center" }}>
        No personal data leaves this device.
      </Text>
    </View>
  );
}
