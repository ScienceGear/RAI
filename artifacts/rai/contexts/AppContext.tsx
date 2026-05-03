import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Task, UserProfile, Goal, DiaryEntry, MoodLog, FocusSession, Achievement, Squad, ActivityFeedItem, DangerZoneProfile } from "@/types";
import { getItem, setItem, KEYS } from "@/lib/storage";
import { getDefaultEnergyProfile, autoScheduleTask } from "@/lib/scheduler";
import { categorizeTaskLocal } from "@/lib/categorizer";
import { calculateTaskXP, levelFromXP, calculateRaiScore, DEFAULT_ACHIEVEMENTS, xpForLevel } from "@/lib/xp";
import { isFirebaseConfigured, getOrCreateFirebaseUserId, firestoreSet, firestoreGet } from "@/lib/firebase";
import { scheduleTaskReminder, cancelNotification, sendInstantNotification } from "@/lib/notifications";

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

const defaultDangerZone: DangerZoneProfile = {
  dangerHours: [14, 15, 22, 23],
  topDistractionApps: ["Instagram", "YouTube", "Twitter"],
  weakestDayOfWeek: 6,
  doomLoopSequences: [["Instagram", "YouTube", "Instagram"]],
  dataPointsCount: 0,
  isBootstrapEstimate: true,
  lastComputedAt: new Date().toISOString(),
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
    // Try Firebase first if configured
    let fbUserId: string | null = null;
    if (isFirebaseConfigured) {
      fbUserId = await getOrCreateFirebaseUserId();
      setFirebaseUserId(fbUserId);
    }

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

    // If Firebase available, try to load from cloud (more up-to-date)
    if (fbUserId) {
      const [fp, ft, fg, ffs] = await Promise.all([
        firestoreGet<UserProfile>(fbUserId, "profile"),
        firestoreGet<Task[]>(fbUserId, "tasks"),
        firestoreGet<Goal[]>(fbUserId, "goals"),
        firestoreGet<FocusSession[]>(fbUserId, "focusSessions"),
      ]);
      if (fp) {
        const updated = updateStreak(fp);
        setProfile(updated);
        await setItem(KEYS.USER_PROFILE, updated);
        setIsLoaded(true);
        if (ft) { setTasks(ft); await setItem(KEYS.TASKS, ft); }
        if (fg) { setGoals(fg); await setItem(KEYS.GOALS, fg); }
        if (ffs) { setFocusSessions(ffs); await setItem(KEYS.FOCUS_SESSIONS, ffs); }
        if (m) setMoodLogs(m);
        if (d) setDiary(d);
        if (ach) setAchievements(ach);
        if (sq) setSquad(sq);
        if (af) setActivityFeed(af);
        return;
      }
    }

    // Fall back to local storage
    if (p) {
      const updated = updateStreak(p);
      setProfile(updated);
      // Save updated streak back to storage immediately
      await setItem(KEYS.USER_PROFILE, updated);
      if (fbUserId) firestoreSet(fbUserId, "profile", updated);
    }
    if (t) setTasks(t);
    if (g) setGoals(g);
    if (d) setDiary(d);
    if (m) setMoodLogs(m);
    if (fs) setFocusSessions(fs);
    if (ach) setAchievements(ach);
    if (sq) setSquad(sq);
    if (af) setActivityFeed(af);

    setIsLoaded(true);
  }

  function updateStreak(p: UserProfile): UserProfile {
    const today = todayStr();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (p.lastActiveDate === today) return p;

    let newStreak = p.streak;
    if (p.lastActiveDate === yesterdayStr) {
      newStreak = p.streak + 1;
    } else if (p.lastActiveDate !== today) {
      newStreak = 0;
    }

    return {
      ...p,
      streak: newStreak,
      longestStreak: Math.max(p.longestStreak, newStreak),
      lastActiveDate: today,
    };
  }

  const syncProfile = useCallback((p: UserProfile) => {
    setItem(KEYS.USER_PROFILE, p);
    if (firebaseUserId) firestoreSet(firebaseUserId, "profile", p);
  }, [firebaseUserId]);

  const syncTasks = useCallback((t: Task[]) => {
    setItem(KEYS.TASKS, t);
    if (firebaseUserId) firestoreSet(firebaseUserId, "tasks", t);
  }, [firebaseUserId]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      syncProfile(next);
      return next;
    });
  }, [syncProfile]);

  const addTask = useCallback(async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "sessions" | "skippedCount" | "categoryOverridden" | "isQuickTask" | "completed" | "dependencies">): Promise<Task> => {
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

    // Schedule notification if time is set
    if (newTask.scheduledDate && newTask.scheduledTime) {
      await scheduleTaskReminder(newTask);
    }

    setTasks((prev) => {
      const next = [newTask, ...prev];
      syncTasks(next);
      return next;
    });

    return newTask;
  }, [syncTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks((prev) => {
      const next = prev.map((t) => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
      syncTasks(next);
      return next;
    });
  }, [syncTasks]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      syncTasks(next);
      return next;
    });
  }, [syncTasks]);

  const completeTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.completed) return;

    const xpEarned = calculateTaskXP(task);

    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : t
      );
      syncTasks(next);
      return next;
    });

    setProfile((prev) => {
      const newXP = prev.xp + xpEarned;
      const newLevel = levelFromXP(newXP);
      const completedToday = tasks.filter((t) => t.completed && t.completedAt?.startsWith(todayStr())).length + 1;
      const newRaiScore = calculateRaiScore({
        streak: prev.streak,
        tasksCompleted: completedToday,
        focusMinutes: focusSessions.reduce((acc, s) => acc + s.completedMinutes, 0),
        planningRate: 0.8,
        squadMembers: squad?.members.length ?? 0,
      });
      const didLevelUp = newLevel > prev.level;
      const next = { ...prev, xp: newXP, level: newLevel, raiScore: Math.min(1000, newRaiScore), lastActiveDate: todayStr() };
      syncProfile(next);
      if (didLevelUp) {
        sendInstantNotification("🎉 Level Up!", `You reached Level ${newLevel}! Keep going!`);
      }
      return next;
    });

    const newActivity: ActivityFeedItem = {
      id: genId(),
      userId: profile.id,
      userName: profile.firstName,
      actionType: "task_complete",
      actionData: { taskTitle: task.title, xpEarned },
      createdAt: new Date().toISOString(),
    };
    setActivityFeed((prev) => {
      const next = [newActivity, ...prev].slice(0, 50);
      setItem(KEYS.ACTIVITY_FEED, next);
      return next;
    });

    checkAchievements(task, id);
  }, [tasks, profile, focusSessions, squad, syncTasks, syncProfile]);

  const scheduleTask = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const result = autoScheduleTask(task, tasks, profile);
    if (result) {
      await updateTask(taskId, {
        scheduledDate: result.scheduledDate,
        scheduledTime: result.scheduledTime,
        schedulerRationale: result.rationale,
      });
      await scheduleTaskReminder({ ...task, scheduledDate: result.scheduledDate, scheduledTime: result.scheduledTime });
    }
  }, [tasks, profile, updateTask]);

  const addGoal = useCallback(async (goalData: Omit<Goal, "id" | "createdAt" | "updatedAt" | "progress">) => {
    const newGoal: Goal = {
      ...goalData,
      id: genId(),
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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
      return next;
    });
    await addXP(25);
  }, []);

  const updateDiaryEntry = useCallback(async (id: string, updates: Partial<DiaryEntry>) => {
    setDiary((prev) => {
      const next = prev.map((d) => d.id === id ? { ...d, ...updates } : d);
      setItem(KEYS.DIARY, next);
      return next;
    });
  }, []);

  const logMood = useCallback(async (mood: number, tags: string[]) => {
    const log: MoodLog = { id: genId(), mood: mood as 1 | 2 | 3 | 4 | 5, tags, timestamp: new Date().toISOString() };
    setMoodLogs((prev) => {
      const next = [log, ...prev];
      setItem(KEYS.MOOD_LOGS, next);
      return next;
    });
    await addXP(10);
  }, []);

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
      await addXP(xp);
      await sendInstantNotification(
        "🎯 Focus session complete!",
        `${session.taskTitle} · +${xp} XP earned`
      );
    }
  }, [firebaseUserId]);

  const unlockAchievement = useCallback(async (id: string) => {
    setAchievements((prev) => {
      const ach = prev.find((a) => a.id === id);
      if (!ach || ach.unlocked) return prev;
      const next = prev.map((a) =>
        a.id === id ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a
      );
      setItem(KEYS.ACHIEVEMENTS, next);
      addXP(ach.xpReward);
      sendInstantNotification("🏆 Achievement unlocked!", `${ach.name} — ${ach.description}`);
      return next;
    });
  }, []);

  const addXP = useCallback(async (amount: number) => {
    setProfile((prev) => {
      const newXP = prev.xp + amount;
      const newLevel = levelFromXP(newXP);
      const next = { ...prev, xp: newXP, level: newLevel };
      syncProfile(next);
      return next;
    });
  }, [syncProfile]);

  const resetOnboarding = useCallback(async () => {
    await AsyncStorage.clear();
    setProfile({ ...defaultProfile, id: genId() });
    setTasks([]);
    setGoals([]);
    setDiary([]);
    setMoodLogs([]);
    setFocusSessions([]);
    setAchievements(DEFAULT_ACHIEVEMENTS);
    setSquad(null);
  }, []);

  function checkAchievements(task: Task, _id: string) {
    const completedTasks = tasks.filter((t) => t.completed).length + 1;
    if (completedTasks === 1) unlockAchievement("first_task");
    if (completedTasks === 10) unlockAchievement("tasks_10");
    if (completedTasks === 100) unlockAchievement("tasks_100");
    const hour = new Date().getHours();
    if (hour < 8) unlockAchievement("early_bird");
    if (hour >= 22) unlockAchievement("night_owl");
    if (profile.streak >= 7) unlockAchievement("streak_7");
    if (profile.streak >= 30) unlockAchievement("streak_30");
  }

  const completedTodayCount = tasks.filter((t) => t.completed && t.completedAt?.startsWith(todayStr())).length;
  const todayTaskCount = tasks.filter((t) => t.scheduledDate === todayStr()).length;
  const todayFocusMinutes = focusSessions.filter((s) => s.startedAt.startsWith(todayStr())).reduce((acc, s) => acc + s.completedMinutes, 0);
  const todayFocusScore = Math.min(100, Math.round(
    (todayTaskCount > 0 ? (completedTodayCount / Math.max(todayTaskCount, 1)) * 60 : 30) +
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
