import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export interface BlockedApp {
  packageName: string;
  appName: string;
}

const BLOCKED_APPS_KEY = "rai_blocked_apps";
const GRACE_PERIODS_KEY = "rai_blocked_app_grace_periods";

type GracePeriodMap = Record<string, number>;

async function readGracePeriods(): Promise<GracePeriodMap> {
  const raw = await AsyncStorage.getItem(GRACE_PERIODS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as GracePeriodMap;
  } catch {
    return {};
  }
}

async function writeGracePeriods(map: GracePeriodMap): Promise<void> {
  await AsyncStorage.setItem(GRACE_PERIODS_KEY, JSON.stringify(map));
}

export const AppBlocker = {
  isAvailable(): boolean {
    return Platform.OS !== "web";
  },

  isServiceEnabled(): boolean {
    return Platform.OS !== "web";
  },

  async requestAccessibilityPermission(): Promise<void> {
    return;
  },

  async getInstalledApps(): Promise<BlockedApp[]> {
    return [];
  },

  async setBlockedApps(apps: BlockedApp[]): Promise<void> {
    await AsyncStorage.setItem(BLOCKED_APPS_KEY, JSON.stringify(apps));
  },

  async getBlockedApps(): Promise<BlockedApp[]> {
    const raw = await AsyncStorage.getItem(BLOCKED_APPS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as BlockedApp[];
    } catch {
      return [];
    }
  },

  async addGracePeriod(packageName: string, minutes: number): Promise<void> {
    const grace = await readGracePeriods();
    grace[packageName] = Date.now() + minutes * 60 * 1000;
    await writeGracePeriods(grace);
  },

  async isInGracePeriod(packageName: string): Promise<boolean> {
    const grace = await readGracePeriods();
    const expiresAt = grace[packageName] ?? 0;
    if (expiresAt <= Date.now()) {
      if (expiresAt) {
        delete grace[packageName];
        await writeGracePeriods(grace);
      }
      return false;
    }
    return true;
  },
};
