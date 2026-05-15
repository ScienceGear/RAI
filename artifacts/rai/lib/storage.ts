import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  USER_PROFILE: "rai:user_profile",
  TASKS: "rai:tasks",
  GOALS: "rai:goals",
  DIARY: "rai:diary",
  MOOD_LOGS: "rai:mood_logs",
  FOCUS_SESSIONS: "rai:focus_sessions",
  ACHIEVEMENTS: "rai:achievements",
  SQUAD: "rai:squad",
  DANGER_ZONE: "rai:danger_zone",
  SQUAD_MEMBERS: "rai:squad_members",
  ACTIVITY_FEED: "rai:activity_feed",
  ONBOARDING_DONE: "rai:onboarding_done",
};

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const val = await AsyncStorage.getItem(key);
    if (!val) return null;
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
  }
}

export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch {
  }
}

export { KEYS };
