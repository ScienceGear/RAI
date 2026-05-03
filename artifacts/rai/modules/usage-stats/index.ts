import { Platform } from "react-native";

export interface AppUsage {
  packageName: string;
  appName: string;
  totalMinutes: number;
  openCount: number;
  category: "social" | "entertainment" | "browser" | "games" | "other";
  iconBase64: string;
}

export interface HourlyScreenTime {
  hour: number;
  totalMinutes: number;
  sessionCount: number;
}

export type PermissionStatus = "granted" | "denied" | "unavailable";

let NativeUsageStats: any = null;
try {
  const { requireNativeModule } = require("expo-modules-core");
  NativeUsageStats = requireNativeModule("UsageStats");
} catch {
  // Expo Go or web — native module not available
}

const isAvailable = Platform.OS === "android" && NativeUsageStats !== null;

export const UsageStats = {
  isAvailable(): boolean {
    return isAvailable;
  },

  hasPermission(): boolean {
    if (!isAvailable) return false;
    try { return NativeUsageStats.hasPermission() === true; } catch { return false; }
  },

  async requestPermission(): Promise<void> {
    if (!isAvailable) return;
    await NativeUsageStats.requestPermission();
  },

  /** Today's app usage (backwards compat) */
  async getTodayAppUsage(): Promise<AppUsage[]> {
    if (!isAvailable) return [];
    try { return await NativeUsageStats.getTodayAppUsage(); } catch { return []; }
  },

  /** App usage for any day — pass start-of-day epoch ms */
  async getUsageForDate(startOfDayMs: number): Promise<AppUsage[]> {
    if (!isAvailable) return [];
    try { return await NativeUsageStats.getUsageForDate(startOfDayMs); } catch { return []; }
  },

  /** Phone unlock count for a time range */
  async getUnlockCount(startMs: number, endMs: number): Promise<number> {
    if (!isAvailable) return 0;
    try { return await NativeUsageStats.getUnlockCount(startMs, endMs); } catch { return 0; }
  },

  /** Hourly breakdown for today (backwards compat) */
  async getHourlyScreenTime(): Promise<HourlyScreenTime[]> {
    if (!isAvailable) return [];
    try { return await NativeUsageStats.getHourlyScreenTime(); } catch { return []; }
  },

  /** Hourly breakdown for any day — pass start-of-day epoch ms */
  async getHourlyScreenTimeForDate(startOfDayMs: number): Promise<HourlyScreenTime[]> {
    if (!isAvailable) return [];
    try { return await NativeUsageStats.getHourlyScreenTimeForDate(startOfDayMs); } catch { return []; }
  },

  async getWeeklyTotals(): Promise<{ date: string; totalMinutes: number }[]> {
    if (!isAvailable) return [];
    try { return await NativeUsageStats.getWeeklyTotals(); } catch { return []; }
  },
};
