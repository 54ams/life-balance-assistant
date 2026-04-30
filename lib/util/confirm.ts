// Cross-platform confirmation + info dialogs.
//
// React Native's Alert.alert is a no-op on web (react-native-web stubs the
// buttons), so destructive actions wired through it silently do nothing in
// the browser. This helper falls back to window.confirm / window.alert on
// web and uses the native Alert on iOS/Android.

import { Alert, Platform } from "react-native";

export async function confirmDestructive(
  title: string,
  message: string,
  confirmLabel: string = "Delete",
  cancelLabel: string = "Cancel",
): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || typeof window.confirm !== "function") {
      return false;
    }
    return window.confirm(`${title}\n\n${message}`);
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message?: string): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}
