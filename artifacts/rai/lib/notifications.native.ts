import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Task } from "@/types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function getNotificationPermissionStatus(): Promise<"granted" | "denied" | "undetermined"> {
  if (Platform.OS === "web") return "denied";
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as "granted" | "denied" | "undetermined";
  } catch {
    return "undetermined";
  }
}

export async function scheduleTaskReminder(task: Task): Promise<string | null> {
  if (!task.scheduledDate || !task.scheduledTime || Platform.OS === "web") return null;
  try {
    const [hours, minutes] = task.scheduledTime.split(":").map(Number);
    const triggerDate = new Date(task.scheduledDate);
    triggerDate.setHours(hours, minutes - 15, 0, 0);
    if (triggerDate <= new Date()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Starting in 15 min",
        body: task.title,
        sound: "default",
        data: { taskId: task.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
}

export async function scheduleDailyBriefing(hour = 8, minute = 0): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🌅 Good morning! Your day is ready",
        body: "Check your RAI schedule and start strong.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return id;
  } catch {
    return null;
  }
}

export async function sendInstantNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: "default" },
      trigger: null,
    });
  } catch {}
}

export async function scheduleDangerZoneAlert(dangerHour: number): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 Danger Zone approaching",
        body: `Your distraction window starts at ${dangerHour}:00. Wrap up or lock in!`,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: dangerHour - 1,
        minute: 45,
      },
    });
  } catch {}
}
