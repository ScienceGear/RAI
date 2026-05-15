import { NativeModules, Platform } from "react-native";

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

export interface UsageEntryMs {
  packageName: string;
  totalTimeInForeground: number;
}

export interface HourlyUsageEntryMs {
  hour: number;
  packageName: string;
  totalTimeInForeground: number;
}

export type PermissionStatus = "granted" | "denied" | "unavailable";

type NativeUsageStatsModule = {
  hasUsageAccess?: () => boolean;
  hasPermission?: () => boolean;
  requestPermission?: () => Promise<void>;
  isBatteryOptimizationIgnored?: () => boolean;
  requestIgnoreBatteryOptimizations?: () => Promise<void>;
  getTodayUsage?: () => Promise<UsageEntryMs[]>;
  getUsageByHourForDate?: (startOfDayMs: number) => Promise<HourlyUsageEntryMs[]>;
  getUnlockCount?: (startMs: number, endMs: number) => number;
  getWeeklyTotals?: () => { date: string; totalMinutes: number }[];
};

const nativeModule: NativeUsageStatsModule | null =
  Platform.OS === "android" ? (NativeModules.UsageStats as NativeUsageStatsModule | undefined) ?? null : null;

const isAvailable = Platform.OS === "android" && nativeModule !== null;

function aggregateToAppUsage(rows: UsageEntryMs[]): AppUsage[] {
  const grouped = new Map<string, number>();
  for (const row of rows) {
    grouped.set(row.packageName, (grouped.get(row.packageName) ?? 0) + row.totalTimeInForeground);
  }
  return [...grouped.entries()]
    .map(([packageName, totalTimeInForeground]) => ({
      packageName,
      appName: packageName,
      totalMinutes: Math.round(totalTimeInForeground / 60000),
      openCount: 0,
      category: "other" as const,
      iconBase64: "",
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
}

function aggregateHourly(rows: HourlyUsageEntryMs[]): HourlyScreenTime[] {
  const byHour = new Map<number, { totalTimeMs: number; sessionCount: number }>();
  for (const row of rows) {
    const current = byHour.get(row.hour) ?? { totalTimeMs: 0, sessionCount: 0 };
    current.totalTimeMs += row.totalTimeInForeground;
    current.sessionCount += 1;
    byHour.set(row.hour, current);
  }
  return [...byHour.entries()]
    .map(([hour, value]) => ({
      hour,
      totalMinutes: Math.round(value.totalTimeMs / 60000),
      sessionCount: value.sessionCount,
    }))
    .sort((a, b) => a.hour - b.hour);
}

export const UsageStats = {
  isAvailable(): boolean {
    return isAvailable;
  },

  hasPermission(): boolean {
    if (!isAvailable) return false;
    try { return nativeModule?.hasPermission?.() === true || nativeModule?.hasUsageAccess?.() === true; } catch { return false; }
  },

  hasUsageAccess(): boolean {
    if (!isAvailable) return false;
    try { return nativeModule?.hasUsageAccess?.() === true || nativeModule?.hasPermission?.() === true; } catch { return false; }
  },

  async requestPermission(): Promise<void> {
    if (!isAvailable) return;
    await nativeModule?.requestPermission?.();
  },

  isBatteryOptimizationIgnored(): boolean {
    if (!isAvailable) return false;
    try { return nativeModule?.isBatteryOptimizationIgnored?.() === true; } catch { return false; }
  },

  async requestIgnoreBatteryOptimizations(): Promise<void> {
    if (!isAvailable) return;
    await nativeModule?.requestIgnoreBatteryOptimizations?.();
  },

  async getTodayUsage(): Promise<UsageEntryMs[]> {
    if (!isAvailable) return [];
    try { return await nativeModule?.getTodayUsage?.() ?? []; } catch { return []; }
  },

  async getUsageByHourForDate(startOfDayMs: number): Promise<HourlyUsageEntryMs[]> {
    if (!isAvailable) return [];
    try { return await nativeModule?.getUsageByHourForDate?.(startOfDayMs) ?? []; } catch { return []; }
  },

  /** Today's app usage (backwards compat) */
  async getTodayAppUsage(): Promise<AppUsage[]> {
    if (!isAvailable) return [];
    try {
      const usage = await nativeModule?.getTodayUsage?.() ?? [];
      return aggregateToAppUsage(usage);
    } catch { return []; }
  },

  /** App usage for any day — pass start-of-day epoch ms */
  async getUsageForDate(startOfDayMs: number): Promise<AppUsage[]> {
    if (!isAvailable) return [];
    try {
      const usage = await nativeModule?.getUsageByHourForDate?.(startOfDayMs) ?? [];
      return aggregateToAppUsage(usage);
    } catch { return []; }
  },

  /** Phone unlock count for a time range */
  async getUnlockCount(startMs: number, endMs: number): Promise<number> {
    if (!isAvailable) return 0;
    try {
      if ((nativeModule as { getUnlockCount?: (startMs: number, endMs: number) => number })?.getUnlockCount) {
        return (nativeModule as { getUnlockCount: (startMs: number, endMs: number) => number }).getUnlockCount(startMs, endMs);
      }
      return 0;
    } catch {
      return 0;
    }
  },

  /** Hourly breakdown for today (backwards compat) */
  async getHourlyScreenTime(): Promise<HourlyScreenTime[]> {
    if (!isAvailable) return [];
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const rows = await nativeModule?.getUsageByHourForDate?.(start.getTime()) ?? [];
      return aggregateHourly(rows);
    } catch { return []; }
  },

  /** Hourly breakdown for any day — pass start-of-day epoch ms */
  async getHourlyScreenTimeForDate(startOfDayMs: number): Promise<HourlyScreenTime[]> {
    if (!isAvailable) return [];
    try {
      const rows = await nativeModule?.getUsageByHourForDate?.(startOfDayMs) ?? [];
      return aggregateHourly(rows);
    } catch { return []; }
  },

  async getWeeklyTotals(): Promise<{ date: string; totalMinutes: number }[]> {
    if (!isAvailable) return [];
    try {
      if ((nativeModule as { getWeeklyTotals?: () => { date: string; totalMinutes: number }[] })?.getWeeklyTotals) {
        return (nativeModule as { getWeeklyTotals: () => { date: string; totalMinutes: number }[] }).getWeeklyTotals();
      }
      return [];
    } catch {
      return [];
    }
  },
};
