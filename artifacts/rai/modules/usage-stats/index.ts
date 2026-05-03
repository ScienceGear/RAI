/**
 * Android UsageStats native module wrapper.
 * Falls back gracefully when running in Expo Go or on web.
 */
import { Platform } from "react-native";

export interface AppUsage {
  packageName: string;
  appName: string;
  totalMinutes: number;
  category: "social" | "entertainment" | "browser" | "games" | "other";
}

export interface HourlyScreenTime {
  hour: number;
  totalMinutes: number;
  sessionCount: number;
}

export type PermissionStatus = "granted" | "denied" | "unavailable";

// Attempt to load the native module — only works in development builds, not Expo Go
let NativeUsageStats: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { requireNativeModule } = require("expo-modules-core");
  NativeUsageStats = requireNativeModule("UsageStats");
} catch {
  // Running in Expo Go or web — native module not available
}

const isAvailable = Platform.OS === "android" && NativeUsageStats !== null;

export const UsageStats = {
  /**
   * Returns true if the native module is available (development build + Android).
   */
  isAvailable(): boolean {
    return isAvailable;
  },

  /**
   * Check if PACKAGE_USAGE_STATS permission is granted.
   */
  hasPermission(): boolean {
    if (!isAvailable) return false;
    try {
      return NativeUsageStats.hasPermission() === true;
    } catch {
      return false;
    }
  },

  /**
   * Opens Android Usage Access settings so the user can grant permission.
   */
  async requestPermission(): Promise<void> {
    if (!isAvailable) return;
    await NativeUsageStats.requestPermission();
  },

  /**
   * Get today's top apps sorted by screen time.
   */
  async getTodayAppUsage(): Promise<AppUsage[]> {
    if (!isAvailable) return [];
    try {
      return await NativeUsageStats.getTodayAppUsage();
    } catch {
      return [];
    }
  },

  /**
   * Get per-hour screen time breakdown for today (0–23).
   */
  async getHourlyScreenTime(): Promise<HourlyScreenTime[]> {
    if (!isAvailable) return [];
    try {
      return await NativeUsageStats.getHourlyScreenTime();
    } catch {
      return [];
    }
  },

  /**
   * Get daily totals for the last 7 days.
   */
  async getWeeklyTotals(): Promise<{ date: string; totalMinutes: number }[]> {
    if (!isAvailable) return [];
    try {
      return await NativeUsageStats.getWeeklyTotals();
    } catch {
      return [];
    }
  },
};
