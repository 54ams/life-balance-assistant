import React from "react";
import { Pressable, Text, View } from "react-native";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string };

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Unexpected error" };
  }

  componentDidCatch(error: Error) {
    console.error("App boundary:", error.message);
  }

  reset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return <BoundaryFallback message={this.state.message} onRetry={this.reset} />;
  }
}

function BoundaryFallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: c.background }}>
      <Text style={{ color: c.text.primary, fontSize: 20, fontWeight: "800" }}>Something went wrong</Text>
      <Text style={{ color: c.text.secondary, marginTop: 8, textAlign: "center" }}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={{
          marginTop: 14,
          borderRadius: 999,
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: c.accent.primary,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Try again</Text>
      </Pressable>
    </View>
  );
}
