import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Task, UserProfile, Goal, DiaryEntry, MoodLog, FocusSession, Achievement, Squad, ActivityFeedItem, DangerZoneProfile } from "@/types";
import { getItem, setItem, KEYS } from "@/lib/storage";
import { getDefaultEnergyProfile, autoScheduleTask } from "@/lib/scheduler";
import { categorizeTaskLocal } from "@/lib/categorizer";
import { calculateTaskXP, levelFromXP, calculateRaiScore, DEFAULT_ACHIEVEMENTS } from "@/lib/xp";
import { getOrCreateFirebaseUserId, firestoreSet, firestoreGet, firestoreSetAll, firestoreGetAll } from "@/lib/firebase";
import { scheduleTaskReminder, sendInstantNotification } from "@/lib/notifications";

const FIRESTORE_KEYS = ["profile", "tasks", "goals", "diary", "moodLogs", "focusSessions", "achievements", "activityFeed"];

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

interface AppContextType {
  profile: UserProfile;
  tasks: Task[];
  goals: Goal[];
  diary: DiaryEntry[];
  moodLogs: MoodLog[];
  focusSessions: FocusSession[];
  achievements: Achievement[];
  squad: Squad | null;
  activityFeed: ActivityFeedItem[];
  dangerZone: DangerZoneProfile;
  todayFocusScore: number;
  isLoaded: boolean;
  firebaseUserId: string | null;

  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "sessions" | "skippedCount" | "categoryOverridden" | "isQuickTask" | "completed" | "dependencies">) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  scheduleTask: (taskId: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "updatedAt" | "progress">) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  addDiaryEntry: (entry: DiaryEntry) => Promise<void>;
  updateDiaryEntry: (id: string, updates: Partial<DiaryEntry>) => Promise<void>;
  logMood: (mood: number, tags: string[]) => Promise<void>;
  addFocusSession: (session: Omit<FocusSession, "id">) => Promise<void>;
  unlockAchievement: (id: string) => Promise<void>;
  addXP: (amount: number) => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const defaultDangerZone: DangerZoneProfile = {
  dangerHours: [14, 15, 22, 23],
  topDistractionApps: ["Instagram", "YouTube", "Twitter"],
  weakestDayOfWeek: 6,
  doomLoopSequences: [["Instagram", "YouTube", "Instagram"]],
  dataPointsCount: 0,
  isBootstrapEstimate: true,
  lastComputedAt: new Date().toISOString(),
};

const defaultProfile: UserProfile = {
  id: genId(),
  name: "User",
  firstName: "User",
  email: "",
  primaryFocus: "mixed",
  goalType: "",
  mainStruggle: [],
  motivation: "personal growth",
  chronotype: "morning",
  sleepStart: "23:00",
  sleepEnd: "07:00",
  wakeBuffer: 30,
  sleepBuffer: 45,
  mealTimes: [
    { name: "Lunch", start: "13:00", duration: 45 },
    { name: "Dinner", start: "19:00", duration: 45 },
  ],
  preferredWorkHours: ["09:00-12:00", "16:00-19:00"],
  dailyCapacityMinutes: 480,
  energyProfile: getDefaultEnergyProfile("morning"),
  durationAccuracyFactor: 1.0,
  xp: 0,
  level: 1,
  streak: 0,
  longestStreak: 0,
  lastActiveDate: todayStr(),
  raiScore: 0,
  onboardingComplete: false,
  theme: "dark",
  aiMemory: [],
  notificationsGranted: false,
  usageStatsGranted: false,
  accessibilityGranted: false,
  microphoneGranted: false,
};

export const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [dangerZone] = useState<DangerZoneProfile>(defaultDangerZone);
  const [isLoaded, setIsLoaded] = useState(false);
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    // Sign into Firebase anonymously — always
    const fbUid = await getOrCreateFirebaseUserId();
    setFirebaseUserId(fbUid);

    if (fbUid) {
      // Try to load everything from Firestore first (cloud is source of truth)
      const cloud = await firestoreGetAll(fbUid, FIRESTORE_KEYS);

      const p = (cloud["profile"] as UserProfile | null) ?? (await getItem<UserProfile>(KEYS.USER_PROFILE));
      const t = (cloud["tasks"] as Task[] | null) ?? (await getItem<Task[]>(KEYS.TASKS)) ?? [];
      const g = (cloud["goals"] as Goal[] | null) ?? (await getItem<Goal[]>(KEYS.GOALS)) ?? [];
      const d = (cloud["diary"] as DiaryEntry[] | null) ?? (await getItem<DiaryEntry[]>(KEYS.DIARY)) ?? [];
      const m = (cloud["moodLogs"] as MoodLog[] | null) ?? (await getItem<MoodLog[]>(KEYS.MOOD_LOGS)) ?? [];
      const fs = (cloud["focusSessions"] as FocusSession[] | null) ?? (await getItem<FocusSession[]>(KEYS.FOCUS_SESSIONS)) ?? [];
      const ach = (cloud["achievements"] as Achievement[] | null) ?? (await getItem<Achievement[]>(KEYS.ACHIEVEMENTS)) ?? DEFAULT_ACHIEVEMENTS;
      const af = (cloud["activityFeed"] as ActivityFeedItem[] | null) ?? (await getItem<ActivityFeedItem[]>(KEYS.ACTIVITY_FEED)) ?? [];
      const sq = await getItem<Squad>(KEYS.SQUAD);

      const updatedProfile = applyStreak(p ?? defaultProfile);

      setProfile(updatedProfile);
      setTasks(t);
      setGoals(g);
      setDiary(d);
      setMoodLogs(m);
      setFocusSessions(fs);
      setAchievements(ach.length > 0 ? ach : DEFAULT_ACHIEVEMENTS);
      setSquad(sq);
      setActivityFeed(af);

      // Persist locally and sync streak update back to Firestore
      await setItem(KEYS.USER_PROFILE, updatedProfile);
      firestoreSet(fbUid, "profile", updatedProfile);
    } else {
      // Offline fallback: load from local storage only
      const [p, t, g, d, m, fs, ach, sq, af] = await Promise.all([
        getItem<UserProfile>(KEYS.USER_PROFILE),
        getItem<Task[]>(KEYS.TASKS),
        getItem<Goal[]>(KEYS.GOALS),
        getItem<DiaryEntry[]>(KEYS.DIARY),
        getItem<MoodLog[]>(KEYS.MOOD_LOGS),
        getItem<FocusSession[]>(KEYS.FOCUS_SESSIONS),
        getItem<Achievement[]>(KEYS.ACHIEVEMENTS),
        getItem<Squad>(KEYS.SQUAD),
        getItem<ActivityFeedItem[]>(KEYS.ACTIVITY_FEED),
      ]);
      const updatedProfile = applyStreak(p ?? defaultProfile);
      setProfile(updatedProfile);
      await setItem(KEYS.USER_PROFILE, updatedProfile);
      setTasks(t ?? []);
      setGoals(g ?? []);
      setDiary(d ?? []);
      setMoodLogs(m ?? []);
      setFocusSessions(fs ?? []);
      setAchievements(ach ?? DEFAULT_ACHIEVEMENTS);
      setSquad(sq);
      setActivityFeed(af ?? []);
    }

    setIsLoaded(true);
  }

  function applyStreak(p: UserProfile): UserProfile {
    const today = todayStr();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    if (p.lastActiveDate === today) return p;
    const newStreak = p.lastActiveDate === yesterdayStr ? p.streak + 1 : 0;
    return {
      ...p,
      streak: newStreak,
      longestStreak: Math.max(p.longestStreak ?? 0, newStreak),
      lastActiveDate: today,
    };
  }

  // Dual-write helper: local + Firestore
  const persist = useCallback(async (key: string, localKey: string, data: unknown) => {
    await setItem(localKey, data);
    if (firebaseUserId) firestoreSet(firebaseUserId, key, data);
  }, [firebaseUserId]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      setItem(KEYS.USER_PROFILE, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "profile", next);
      return next;
    });
  }, [firebaseUserId]);

  const addTask = useCallback(async (
    taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "sessions" | "skippedCount" | "categoryOverridden" | "isQuickTask" | "completed" | "dependencies">
  ): Promise<Task> => {
    const category = taskData.categoryPrimary || categorizeTaskLocal(taskData.title);
    const newTask: Task = {
      ...taskData,
      id: genId(),
      categoryPrimary: category,
      categoryOverridden: false,
      isQuickTask: taskData.estimatedMinutes <= 15,
      completed: false,
      dependencies: [],
      sessions: [],
      skippedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (newTask.scheduledDate && newTask.scheduledTime) {
      scheduleTaskReminder(newTask);
    }

    setTasks((prev) => {
      const next = [newTask, ...prev];
      setItem(KEYS.TASKS, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "tasks", next);
      return next;
    });

    return newTask;
  }, [firebaseUserId]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      );
      setItem(KEYS.TASKS, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "tasks", next);
      return next;
    });
  }, [firebaseUserId]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      setItem(KEYS.TASKS, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "tasks", next);
      return next;
    });
  }, [firebaseUserId]);

  const completeTask = useCallback(async (id: string) => {
    setTasks((prevTasks) => {
      const task = prevTasks.find((t) => t.id === id);
      if (!task || task.completed) return prevTasks;

      const xpEarned = calculateTaskXP(task);
      const next = prevTasks.map((t) =>
        t.id === id
          ? { ...t, completed: true, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : t
      );
      setItem(KEYS.TASKS, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "tasks", next);

      // Update profile XP + score
      setProfile((prev) => {
        const newXP = prev.xp + xpEarned;
        const newLevel = levelFromXP(newXP);
        const didLevelUp = newLevel > prev.level;
        const completedCount = next.filter((t) => t.completed).length;
        const newScore = Math.min(1000, calculateRaiScore({
          streak: prev.streak,
          tasksCompleted: completedCount,
          focusMinutes: 0,
          planningRate: 0.8,
          squadMembers: 0,
        }));
        const updated = { ...prev, xp: newXP, level: newLevel, raiScore: newScore, lastActiveDate: todayStr() };
        setItem(KEYS.USER_PROFILE, updated);
        if (firebaseUserId) firestoreSet(firebaseUserId, "profile", updated);
        if (didLevelUp) sendInstantNotification("🎉 Level Up!", `You reached Level ${newLevel}!`);
        return updated;
      });

      // Log activity
      const activity: ActivityFeedItem = {
        id: genId(),
        userId: "",
        userName: "",
        actionType: "task_complete",
        actionData: { taskTitle: task.title, xpEarned },
        createdAt: new Date().toISOString(),
      };
      setActivityFeed((prev) => {
        const updated = [activity, ...prev].slice(0, 50);
        setItem(KEYS.ACTIVITY_FEED, updated);
        if (firebaseUserId) firestoreSet(firebaseUserId, "activityFeed", updated);
        return updated;
      });

      return next;
    });
  }, [firebaseUserId]);

  const scheduleTask = useCallback(async (taskId: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;
      const result = autoScheduleTask(task, prev, profile);
      if (!result) return prev;
      const next = prev.map((t) =>
        t.id === taskId
          ? { ...t, scheduledDate: result.scheduledDate, scheduledTime: result.scheduledTime, schedulerRationale: result.rationale, updatedAt: new Date().toISOString() }
          : t
      );
      setItem(KEYS.TASKS, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "tasks", next);
      scheduleTaskReminder({ ...task, scheduledDate: result.scheduledDate, scheduledTime: result.scheduledTime });
      return next;
    });
  }, [profile, firebaseUserId]);

  const addGoal = useCallback(async (goalData: Omit<Goal, "id" | "createdAt" | "updatedAt" | "progress">) => {
    const newGoal: Goal = { ...goalData, id: genId(), progress: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setGoals((prev) => {
      const next = [...prev, newGoal];
      setItem(KEYS.GOALS, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "goals", next);
      return next;
    });
  }, [firebaseUserId]);

  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    setGoals((prev) => {
      const next = prev.map((g) => g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g);
      setItem(KEYS.GOALS, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "goals", next);
      return next;
    });
  }, [firebaseUserId]);

  const addDiaryEntry = useCallback(async (entry: DiaryEntry) => {
    setDiary((prev) => {
      const next = [entry, ...prev.filter((d) => d.id !== entry.id)];
      setItem(KEYS.DIARY, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "diary", next);
      return next;
    });
    addXP(25);
  }, [firebaseUserId]);

  const updateDiaryEntry = useCallback(async (id: string, updates: Partial<DiaryEntry>) => {
    setDiary((prev) => {
      const next = prev.map((d) => d.id === id ? { ...d, ...updates } : d);
      setItem(KEYS.DIARY, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "diary", next);
      return next;
    });
  }, [firebaseUserId]);

  const logMood = useCallback(async (mood: number, tags: string[]) => {
    const log: MoodLog = { id: genId(), mood: mood as 1 | 2 | 3 | 4 | 5, tags, timestamp: new Date().toISOString() };
    setMoodLogs((prev) => {
      const next = [log, ...prev];
      setItem(KEYS.MOOD_LOGS, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "moodLogs", next);
      return next;
    });
    addXP(10);
  }, [firebaseUserId]);

  const addFocusSession = useCallback(async (session: Omit<FocusSession, "id">) => {
    const newSession: FocusSession = { ...session, id: genId() };
    setFocusSessions((prev) => {
      const next = [newSession, ...prev];
      setItem(KEYS.FOCUS_SESSIONS, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "focusSessions", next);
      return next;
    });
    if (session.completed) {
      const xp = Math.round(session.completedMinutes * 1.5);
      addXP(xp);
      sendInstantNotification("🎯 Focus complete!", `${session.taskTitle} · +${xp} XP`);
    }
  }, [firebaseUserId]);

  const unlockAchievement = useCallback(async (id: string) => {
    setAchievements((prev) => {
      const ach = prev.find((a) => a.id === id);
      if (!ach || ach.unlocked) return prev;
      const next = prev.map((a) => a.id === id ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a);
      setItem(KEYS.ACHIEVEMENTS, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "achievements", next);
      sendInstantNotification("🏆 Achievement!", `${ach.name} unlocked`);
      addXP(ach.xpReward);
      return next;
    });
  }, [firebaseUserId]);

  const addXP = useCallback(async (amount: number) => {
    setProfile((prev) => {
      const newXP = prev.xp + amount;
      const newLevel = levelFromXP(newXP);
      const next = { ...prev, xp: newXP, level: newLevel };
      setItem(KEYS.USER_PROFILE, next);
      if (firebaseUserId) firestoreSet(firebaseUserId, "profile", next);
      return next;
    });
  }, [firebaseUserId]);

  const resetOnboarding = useCallback(async () => {
    await AsyncStorage.clear();
    const fresh = { ...defaultProfile, id: genId() };
    setProfile(fresh);
    setTasks([]); setGoals([]); setDiary([]); setMoodLogs([]);
    setFocusSessions([]); setAchievements(DEFAULT_ACHIEVEMENTS); setSquad(null);
    if (firebaseUserId) {
      firestoreSetAll(firebaseUserId, {
        profile: fresh, tasks: [], goals: [], diary: [], moodLogs: [],
        focusSessions: [], achievements: DEFAULT_ACHIEVEMENTS, activityFeed: [],
      });
    }
  }, [firebaseUserId]);

  const todayStr2 = todayStr();
  const todayTasks = tasks.filter((t) => t.scheduledDate === todayStr2);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const todayFocusMinutes = focusSessions.filter((s) => s.startedAt.startsWith(todayStr2)).reduce((a, s) => a + s.completedMinutes, 0);
  const todayFocusScore = Math.min(100, Math.round(
    (todayTasks.length > 0 ? (completedToday / Math.max(todayTasks.length, 1)) * 60 : 30) +
    Math.min(40, todayFocusMinutes / 2)
  ));

  return (
    <AppContext.Provider value={{
      profile, tasks, goals, diary, moodLogs, focusSessions, achievements, squad, activityFeed,
      dangerZone, todayFocusScore, isLoaded, firebaseUserId,
      updateProfile, addTask, updateTask, deleteTask, completeTask, scheduleTask,
      addGoal, updateGoal, addDiaryEntry, updateDiaryEntry, logMood, addFocusSession,
      unlockAchievement, addXP, resetOnboarding,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
