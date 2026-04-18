import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";

const DAILY_REMINDER_ID = "daily-checkin-reminder";
const EMOTION_REMINDER_ID = "emotion-quicklog";

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    } as Notifications.NotificationBehavior),
});

// Deep-link: tapping a notification opens the check-in screen.
let _listenerSetUp = false;
export function setupNotificationDeepLink() {
  if (_listenerSetUp) return;
  _listenerSetUp = true;
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    const target = (data?.route as string) ?? "/checkin";
    try {
      router.push(target as any);
    } catch {
      // Fallback — router may not be ready yet on cold start.
    }
  });
}

export async function ensureNotificationPermissions(): Promise<boolean> {
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
      body: "A minute to notice how your body and mind are tracking today.",
      data: { route: "/checkin" },
    },
    trigger: {
      type: "daily",
      hour,
      minute,
      repeats: true,
    } as Notifications.DailyTriggerInput,
  });
}

export async function scheduleEveningEmotionNudge(hour = 20, minute = 0) {
  await Notifications.cancelScheduledNotificationAsync(EMOTION_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: EMOTION_REMINDER_ID,
    content: {
      title: "Want to capture today?",
      body: "A quick snapshot keeps your story accurate.",
      data: { route: "/checkin" },
    },
    trigger: { type: "daily", hour, minute, repeats: true } as Notifications.DailyTriggerInput,
  });
}

export async function cancelEveningEmotionNudge() {
  await Notifications.cancelScheduledNotificationAsync(EMOTION_REMINDER_ID).catch(() => {});
}

export async function sendBalanceDropNow(message: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Balance drop detected",
      body: message,
      data: { route: "/insights/explain" },
    },
    trigger: null,
  });
}

export async function sendTestNotificationNow() {
  await Notifications.scheduleNotificationAsync({
    content: { title: "Test notification", body: "If you see this, notifications work." },
    trigger: null,
  });
}
