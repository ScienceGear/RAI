import { supabase } from "@/src/supabase/client";
import { HourlyUsageEntryMs, UsageEntryMs } from "@/modules/usage-stats";
import { UsageStatsBridge } from "@/src/native/UsageStatsBridge";

const DISTRACTION_PACKAGES = ["instagram", "youtube", "facebook", "chrome"];

export type ScreenTimeTotals = {
  distractionMinutes: number;
  productiveMinutes: number;
  totalMinutes: number;
  topDistractionApps: string[];
};

function isDistractionPackage(packageName: string): boolean {
  const value = packageName.toLowerCase();
  return DISTRACTION_PACKAGES.some((key) => value.includes(key));
}

export async function getScreenTime(): Promise<UsageEntryMs[]> {
  return UsageStatsBridge.getTodayUsage();
}

function toHourStartIso(startOfDayMs: number, hour: number): string {
  const d = new Date(startOfDayMs);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function aggregateTotals(usage: UsageEntryMs[]): ScreenTimeTotals {
  let distractionMs = 0;
  let productiveMs = 0;
  const topDistraction = usage
    .filter((row) => isDistractionPackage(row.packageName))
    .sort((a, b) => b.totalTimeInForeground - a.totalTimeInForeground)
    .slice(0, 5)
    .map((row) => row.packageName);
  for (const row of usage) {
    if (isDistractionPackage(row.packageName)) distractionMs += row.totalTimeInForeground;
    else productiveMs += row.totalTimeInForeground;
  }
  return {
    distractionMinutes: Math.round(distractionMs / 60000),
    productiveMinutes: Math.round(productiveMs / 60000),
    totalMinutes: Math.round((distractionMs + productiveMs) / 60000),
    topDistractionApps: topDistraction,
  };
}

function toUpsertRows(userId: string, startOfDayMs: number, hourly: HourlyUsageEntryMs[]) {
  return hourly.map((entry) => {
    const distractionMinutes = isDistractionPackage(entry.packageName)
      ? Math.round(entry.totalTimeInForeground / 60000)
      : 0;
    const productiveMinutes = distractionMinutes === 0
      ? Math.round(entry.totalTimeInForeground / 60000)
      : 0;
    return {
      user_id: userId,
      logged_at: toHourStartIso(startOfDayMs, entry.hour),
      hour_bucket: entry.hour,
      package_name: entry.packageName,
      total_time_ms: entry.totalTimeInForeground,
      distraction_minutes: distractionMinutes,
      productive_minutes: productiveMinutes,
    };
  });
}

export async function syncScreenTime(userId: string): Promise<ScreenTimeTotals> {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();

  const [usage, usageByHour] = await Promise.all([
    getScreenTime(),
    UsageStatsBridge.getUsageByHourForDate(startMs),
  ]);

  const totals = aggregateTotals(usage);
  const rows = toUpsertRows(userId, startMs, usageByHour);

  if (rows.length > 0) {
    const { error } = await supabase
      .from("screen_time_logs")
      .upsert(rows, { onConflict: "user_id,logged_at,package_name" });
    if (error) throw error;
  }

  return totals;
}
