import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const DAILY_REMINDER_ID = "daily-checkin-reminder";

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    } as Notifications.NotificationBehavior),
});



export async function ensureNotificationPermissions(): Promise<boolean> {
  // iOS needs explicit permission; Android usually OK but still request
  const current = await Notifications.getPermissionsAsync();

  const granted =
    current.granted ||
    (Platform.OS === "ios" &&
      current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL);

  if (granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    (Platform.OS === "ios" &&
      requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)
  );
}

export async function scheduleDailyCheckInReminder(hour: number, minute: number) {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "Daily check-in",
      body: "Log your mood + stress to update your Life Balance Index.",
    },
trigger: {
  type: "daily",
  hour,
  minute,
  repeats: true,
} as Notifications.DailyTriggerInput,
  });
}



export async function sendBalanceDropNow(message: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Balance drop detected",
      body: message,
    },
    trigger: null, // immediately
  });
}

export async function sendTestNotificationNow() {
  await Notifications.scheduleNotificationAsync({
    content: { title: "Test notification", body: "If you see this, notifications work ✅" },
    trigger: null,
  });
}
