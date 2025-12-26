import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermissions() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const req = await Notifications.requestPermissionsAsync();
  return (
    req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function scheduleDailyCheckInReminder(hour: number, minute: number) {
  await Notifications.cancelScheduledNotificationAsync("daily-checkin");
  await Notifications.scheduleNotificationAsync({
    identifier: "daily-checkin",
    content: {
      title: "Daily check-in",
      body: "Log mood, stress, and energy to update your Life Balance Index.",
    },
    trigger: { hour, minute, repeats: true },
  });
}

export async function sendBalanceDropNow(message: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Balance drop detected",
      body: message,
    },
    trigger: null, // send immediately
  });
}
