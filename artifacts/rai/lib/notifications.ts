import { Task } from "@/types";

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function getNotificationPermissionStatus(): Promise<"granted" | "denied" | "undetermined"> {
  return "denied";
}

export async function scheduleTaskReminder(_task: Task): Promise<string | null> {
  return null;
}

export async function cancelNotification(_notificationId: string): Promise<void> {}

export async function scheduleDailyBriefing(_hour?: number, _minute?: number): Promise<string | null> {
  return null;
}

export async function sendInstantNotification(_title: string, _body: string): Promise<void> {}

export async function scheduleDangerZoneAlert(_dangerHour: number): Promise<void> {}
