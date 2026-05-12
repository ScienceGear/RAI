import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";

import { syncScreenTime } from "@/src/services/ScreenTimeService";
import { calculateDangerZonesFromScreenTime } from "@/src/services/DangerZoneEngine";
import { calculateRiskScore } from "@/src/services/RiskEngine";
import { sendInstantNotification } from "@/lib/notifications";
import { supabase } from "@/src/supabase/client";

const TASK_NAME = "rai-background-sync-task";
const LAST_WEEKLY_RECALC_KEY = "rai_last_weekly_danger_recalc";
const ACTIVE_USER_ID_KEY = "rai_background_user_id";

let activeUserId: string | null = null;
let lastDangerHours: number[] = [];

async function readUserContext(userId: string) {
  const { data: profileData } = await supabase
    .from("profiles")
    .select("danger_hours")
    .eq("id", userId)
    .maybeSingle();
  const dangerHours = ((profileData as { danger_hours?: number[] } | null)?.danger_hours ?? []).filter((h) => Number.isFinite(h));

  const { data: taskData } = await supabase
    .from("user_data")
    .select("payload")
    .eq("user_id", userId)
    .eq("key", "tasks")
    .maybeSingle();

  const tasks = ((taskData as { payload?: Array<{ completed?: boolean }> } | null)?.payload ?? []);
  const pendingTasks = tasks.filter((task) => !task.completed).length;

  const { data: moodData } = await supabase
    .from("user_data")
    .select("payload")
    .eq("user_id", userId)
    .eq("key", "moodLogs")
    .maybeSingle();
  const moods = ((moodData as { payload?: Array<{ mood?: number }> } | null)?.payload ?? []);
  const latestMood = moods.length > 0 ? Number(moods[0]?.mood ?? null) : null;

  return {
    dangerHours,
    pendingTasks,
    mood: latestMood,
  };
}

TaskManager.defineTask(TASK_NAME, async () => {
  const userId = activeUserId ?? (await AsyncStorage.getItem(ACTIVE_USER_ID_KEY));
  if (!userId) return BackgroundFetch.BackgroundFetchResult.NoData;

  try {
    await syncScreenTime(userId);
    const now = new Date();

    const lastWeekly = await AsyncStorage.getItem(LAST_WEEKLY_RECALC_KEY);
    const sevenDaysPassed = !lastWeekly || (Date.now() - new Date(lastWeekly).getTime()) >= 7 * 24 * 60 * 60 * 1000;
    if (sevenDaysPassed) {
      lastDangerHours = await calculateDangerZonesFromScreenTime(userId);
      await AsyncStorage.setItem(LAST_WEEKLY_RECALC_KEY, new Date().toISOString());
    }

    const context = await readUserContext(userId);
    const risk = await calculateRiskScore({
      userId,
      pendingTasks: context.pendingTasks,
      idleMinutes: 0,
      mood: context.mood,
      currentHour: now.getHours(),
      dangerHours: lastDangerHours.length > 0 ? lastDangerHours : context.dangerHours,
    });

    if (risk.level === "danger" || risk.level === "critical") {
      await sendInstantNotification("Danger zone alert", "High distraction risk detected. Start a focus session now.");
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTasks(userId: string, dangerHours: number[]): Promise<void> {
  activeUserId = userId;
  lastDangerHours = dangerHours;
  await AsyncStorage.setItem(ACTIVE_USER_ID_KEY, userId);

  const status = await BackgroundFetch.getStatusAsync();
  if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || status === BackgroundFetch.BackgroundFetchStatus.Denied) {
    return;
  }

  const tasks = await TaskManager.getRegisteredTasksAsync();
  const alreadyRegistered = tasks.some((task) => task.taskName === TASK_NAME);
  if (alreadyRegistered) return;

  await BackgroundFetch.registerTaskAsync(TASK_NAME, {
    minimumInterval: 15 * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
