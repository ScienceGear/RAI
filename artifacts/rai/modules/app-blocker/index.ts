import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

export interface BlockedApp {
  packageName: string;
  appName: string;
}

const BLOCKED_APPS_KEY = "rai_blocked_apps";

type NativeAppBlockerModule = {
  isServiceEnabled?: () => boolean;
  requestAccessibilityPermission?: () => Promise<void>;
  getInstalledApps?: () => Promise<BlockedApp[]>;
  setBlockedApps?: (appsJson: string) => void;
  getBlockedApps?: () => string;
  addGracePeriod?: (packageName: string, minutes: number) => void;
  isInGracePeriod?: (packageName: string) => boolean;
};

const nativeModule: NativeAppBlockerModule | null =
  Platform.OS === "android" ? (NativeModules.AppBlocker as NativeAppBlockerModule | undefined) ?? null : null;

function isNativeAvailable(): boolean {
  return Platform.OS === "android" && nativeModule !== null;
}

function parseBlockedApps(raw: string | null | undefined): BlockedApp[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is BlockedApp =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { packageName?: unknown }).packageName === "string" &&
          typeof (item as { appName?: unknown }).appName === "string"
      )
      .map((item) => ({ packageName: item.packageName, appName: item.appName }));
  } catch {
    return [];
  }
}

export const AppBlocker = {
  isAvailable(): boolean {
    return isNativeAvailable();
  },

  isServiceEnabled(): boolean {
    if (!isNativeAvailable()) return false;
    try {
      return nativeModule?.isServiceEnabled?.() === true;
    } catch {
      return false;
    }
  },

  async requestAccessibilityPermission(): Promise<void> {
    if (!isNativeAvailable()) return;
    await nativeModule?.requestAccessibilityPermission?.();
  },

  async getInstalledApps(): Promise<BlockedApp[]> {
    if (!isNativeAvailable()) return [];
    try {
      return (await nativeModule?.getInstalledApps?.()) ?? [];
    } catch {
      return [];
    }
  },

  async setBlockedApps(apps: BlockedApp[]): Promise<void> {
    const payload = JSON.stringify(apps);
    await AsyncStorage.setItem(BLOCKED_APPS_KEY, payload);
    if (!isNativeAvailable()) return;
    nativeModule?.setBlockedApps?.(payload);
  },

  async getBlockedApps(): Promise<BlockedApp[]> {
    if (isNativeAvailable()) {
      try {
        const raw = nativeModule?.getBlockedApps?.() ?? "[]";
        const parsed = parseBlockedApps(raw);
        await AsyncStorage.setItem(BLOCKED_APPS_KEY, JSON.stringify(parsed));
        return parsed;
      } catch {
        // Fall through to AsyncStorage fallback.
      }
    }

    const raw = await AsyncStorage.getItem(BLOCKED_APPS_KEY);
    return parseBlockedApps(raw);
  },

  async addGracePeriod(packageName: string, minutes: number): Promise<void> {
    if (!isNativeAvailable()) return;
    nativeModule?.addGracePeriod?.(packageName, minutes);
  },

  async isInGracePeriod(packageName: string): Promise<boolean> {
    if (!isNativeAvailable()) return false;
    try {
      return nativeModule?.isInGracePeriod?.(packageName) === true;
    } catch {
      return false;
    }
  },
};
