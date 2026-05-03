import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Task } from "@/types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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
  if (Platform.OS === "web" || !task.scheduledDate || !task.scheduledTime) return null;
  try {
    const [h, m] = task.scheduledTime.split(":").map(Number);
    const trigger = new Date(`${task.scheduledDate}T${task.scheduledTime}`);
    trigger.setMinutes(trigger.getMinutes() - 5);
    if (trigger <= new Date()) return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Task starting soon",
        body: `"${task.title}" starts in 5 minutes`,
        data: { taskId: task.id, type: "task_reminder" },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
}

export async function cancelAllNotificationsOfType(type: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.content.data?.type === type)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {}
}

export async function scheduleDailyBriefing(hour = 8, minute = 0): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    await cancelAllNotificationsOfType("daily_briefing");
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "☀️ Good morning — RAI has your plan ready",
        body: "Tap to see today's schedule and focus recommendations.",
        data: { type: "daily_briefing" },
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

export async function sendInstantNotification(title: string, body: string, data?: Record<string, any>): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {} },
      trigger: null,
    });
  } catch {}
}

export async function scheduleDangerZoneAlert(dangerHour: number): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await cancelAllNotificationsOfType(`danger_zone_${dangerHour}`);
    const warnHour = dangerHour === 0 ? 23 : dangerHour - 1;
    const h = dangerHour === 0 ? 12 : dangerHour > 12 ? dangerHour - 12 : dangerHour;
    const period = dangerHour >= 12 ? "PM" : "AM";
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚡ Danger zone approaching",
        body: `Your focus historically drops around ${h} ${period}. Start a session before you drift.`,
        data: { type: `danger_zone_${dangerHour}` },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: warnHour,
        minute: 45,
      },
    });
  } catch {}
}

export async function scheduleSmartAlerts(params: {
  dangerHours: number[];
  brainStateName: string;
  totalScreenMinutes: number;
  socialMinutes: number;
}): Promise<void> {
  if (Platform.OS === "web") return;
  const { dangerHours, brainStateName, totalScreenMinutes, socialMinutes } = params;

  // Danger zone warnings (one per danger hour)
  for (const h of dangerHours.slice(0, 2)) {
    await scheduleDangerZoneAlert(h);
  }

  // Brainrot alert — fire immediately if screen time is very high
  if (socialMinutes > 90) {
    await cancelAllNotificationsOfType("brainrot_alert");
    await sendInstantNotification(
      "😵 Brainrot detected",
      `${socialMinutes} min of social media today. Your focus window is closing — start a session now.`,
      { type: "brainrot_alert" }
    );
  }

  // General high screen time warning
  if (totalScreenMinutes > 180) {
    await cancelAllNotificationsOfType("screen_time_warning");
    const hrs = (totalScreenMinutes / 60).toFixed(1);
    await sendInstantNotification(
      "📱 Screen time check",
      `You've spent ${hrs}h on your phone today. Time for a focused work block?`,
      { type: "screen_time_warning" }
    );
  }
}
