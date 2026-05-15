import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import { supabase } from "@/src/supabase/client";
import { UsageStatsBridge } from "@/src/native/UsageStatsBridge";
import { AppBlocker } from "@/modules/app-blocker";

export const PERMISSION_KEYS = {
  done: "rai_permissions_done",
  usage: "rai_usage_access",
  battery: "rai_battery_exempt",
  accessibility: "rai_accessibility_enabled",
} as const;

export type PermissionGateStatus = {
  notificationsGranted: boolean;
  usageAccessGranted: boolean;
  batteryExempt: boolean;
  accessibilityGranted: boolean;
  done: boolean;
};

async function getNotificationGranted(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function getPermissionGateStatus(): Promise<PermissionGateStatus> {
  const [notif, usageStored, batteryStored, accessibilityStored, doneStored] = await Promise.all([
    getNotificationGranted(),
    AsyncStorage.getItem(PERMISSION_KEYS.usage),
    AsyncStorage.getItem(PERMISSION_KEYS.battery),
    AsyncStorage.getItem(PERMISSION_KEYS.accessibility),
    AsyncStorage.getItem(PERMISSION_KEYS.done),
  ]);

  const usageAccessGranted = UsageStatsBridge.hasUsageAccess() || usageStored === "true";
  const batteryExempt = UsageStatsBridge.isBatteryOptimizationIgnored() || batteryStored === "true";
  const accessibilityGranted = AppBlocker.isServiceEnabled() || accessibilityStored === "true";
  const complete = notif && usageAccessGranted && batteryExempt && accessibilityGranted;
  const done = doneStored === "true" || complete;

  return {
    notificationsGranted: notif,
    usageAccessGranted,
    batteryExempt,
    accessibilityGranted,
    done,
  };
}

export async function persistPermissionStatus(status: PermissionGateStatus): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(PERMISSION_KEYS.done, String(status.done)),
    AsyncStorage.setItem(PERMISSION_KEYS.usage, String(status.usageAccessGranted)),
    AsyncStorage.setItem(PERMISSION_KEYS.battery, String(status.batteryExempt)),
    AsyncStorage.setItem(PERMISSION_KEYS.accessibility, String(status.accessibilityGranted)),
  ]);
}

export async function areMandatoryPermissionsGranted(): Promise<boolean> {
  const status = await getPermissionGateStatus();
  const granted =
    status.notificationsGranted &&
    status.usageAccessGranted &&
    status.batteryExempt &&
    status.accessibilityGranted;
  await persistPermissionStatus({ ...status, done: granted });
  return granted;
}

export async function syncPermissionsToSupabase(userId: string): Promise<void> {
  const status = await getPermissionGateStatus();
  const payload = {
    permissions_complete:
      status.notificationsGranted &&
      status.usageAccessGranted &&
      status.batteryExempt &&
      status.accessibilityGranted,
    usage_access_granted: status.usageAccessGranted,
    battery_exempt: status.batteryExempt,
  };

  await persistPermissionStatus({
    ...status,
    done: payload.permissions_complete,
  });

  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) throw error;
}
