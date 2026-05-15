import { NativeModules, Platform } from "react-native";

import { UsageEntryMs, HourlyUsageEntryMs } from "@/modules/usage-stats";

type NativeUsageStatsModule = {
  getTodayUsage?: () => Promise<UsageEntryMs[]>;
  getUsageByHourForDate?: (startOfDayMs: number) => Promise<HourlyUsageEntryMs[]>;
  hasUsageAccess?: () => boolean;
  hasPermission?: () => boolean;
  requestPermission?: () => Promise<void>;
  isBatteryOptimizationIgnored?: () => boolean;
  requestIgnoreBatteryOptimizations?: () => Promise<void>;
};

const nativeModule: NativeUsageStatsModule | null =
  Platform.OS === "android" ? (NativeModules.UsageStats as NativeUsageStatsModule | undefined) ?? null : null;

export const UsageStatsBridge = {
  isAvailable(): boolean {
    return Platform.OS === "android" && nativeModule !== null;
  },

  hasUsageAccess(): boolean {
    if (!this.isAvailable()) return false;
    try { return nativeModule?.hasUsageAccess?.() === true || nativeModule?.hasPermission?.() === true; } catch { return false; }
  },

  async requestUsageAccess(): Promise<void> {
    if (!this.isAvailable()) return;
    await nativeModule?.requestPermission?.();
  },

  isBatteryOptimizationIgnored(): boolean {
    if (!this.isAvailable()) return false;
    try { return nativeModule?.isBatteryOptimizationIgnored?.() === true; } catch { return false; }
  },

  async requestIgnoreBatteryOptimizations(): Promise<void> {
    if (!this.isAvailable()) return;
    await nativeModule?.requestIgnoreBatteryOptimizations?.();
  },

  async getTodayUsage(): Promise<UsageEntryMs[]> {
    if (!this.isAvailable()) return [];
    try {
      return await nativeModule?.getTodayUsage?.() ?? [];
    } catch {
      return [];
    }
  },

  async getUsageByHourForDate(startOfDayMs: number): Promise<HourlyUsageEntryMs[]> {
    if (!this.isAvailable()) return [];
    try {
      return await nativeModule?.getUsageByHourForDate?.(startOfDayMs) ?? [];
    } catch {
      return [];
    }
  },
};
