import { Task, FocusSession, Achievement } from "@/types";
import { LEVEL_TITLES } from "@/constants/categories";

export function calculateTaskXP(task: Task): number {
  return Math.round((task.difficulty * task.estimatedMinutes) / 8);
}

export function calculateFocusXP(session: FocusSession): number {
  return Math.round(session.completedMinutes * 1.5);
}

export function calculateStreakXP(streakDays: number): number {
  return streakDays * 12;
}

export const MOOD_CHECKIN_XP = 10;
export const DIARY_ENTRY_XP = 25;

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.8));
}

export function levelFromXP(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level++;
    if (level >= 100) break;
  }
  return level;
}

export function getLevelTitle(level: number): string {
  let title = LEVEL_TITLES[0].title;
  for (const entry of LEVEL_TITLES) {
    if (level >= entry.minLevel) title = entry.title;
  }
  return title;
}

export function xpToNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const level = levelFromXP(xp);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const needed = nextLevelXP - currentLevelXP;
  const current = xp - currentLevelXP;
  return {
    current,
    needed,
    progress: needed > 0 ? current / needed : 1,
  };
}

export function calculateRaiScore(params: {
  streak: number;
  tasksCompleted: number;
  focusMinutes: number;
  planningRate: number;
  squadMembers: number;
}): number {
  const consistency = Math.min(100, params.streak * 5 + params.tasksCompleted * 2);
  const focus = Math.min(100, params.focusMinutes / 2);
  const planning = Math.min(100, params.planningRate * 100);
  const recovery = 70;
  const social = Math.min(100, params.squadMembers * 15);
  const growth = Math.min(100, (consistency + focus) / 2);

  return Math.round(
    (consistency * 0.25 + focus * 0.2 + planning * 0.2 + recovery * 0.15 + social * 0.1 + growth * 0.1) * 10
  );
}

export function calculateDailyFocusScore(params: {
  tasksCompleted: number;
  totalTasks: number;
  focusMinutes: number;
  distractionMinutes: number;
}): number {
  const completionScore = params.totalTasks > 0 ? (params.tasksCompleted / params.totalTasks) * 60 : 60;
  const focusScore = Math.min(40, params.focusMinutes / 2);
  const distractionPenalty = Math.min(20, params.distractionMinutes / 5);
  return Math.max(0, Math.round(completionScore + focusScore - distractionPenalty));
}

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: "first_task", name: "First Step", description: "Complete your first task", icon: "checkmark-circle", category: "milestones", xpReward: 50, unlocked: false },
  { id: "tasks_10", name: "Getting Serious", description: "Complete 10 tasks", icon: "star", category: "milestones", xpReward: 100, unlocked: false, progress: 0, target: 10 },
  { id: "tasks_100", name: "Century Mark", description: "Complete 100 tasks", icon: "trophy", category: "milestones", xpReward: 500, unlocked: false, progress: 0, target: 100 },
  { id: "streak_7", name: "7-Day Warrior", description: "Maintain a 7-day streak", icon: "flame", category: "consistency", xpReward: 150, unlocked: false, progress: 0, target: 7 },
  { id: "streak_30", name: "30-Day Legend", description: "Maintain a 30-day streak", icon: "medal", category: "consistency", xpReward: 500, unlocked: false, progress: 0, target: 30 },
  { id: "focus_90", name: "Deep Diver", description: "Complete a 90-minute focus session", icon: "timer", category: "focus", xpReward: 200, unlocked: false },
  { id: "focus_1000min", name: "1000 Minutes", description: "Log 1000 total focus minutes", icon: "time", category: "focus", xpReward: 300, unlocked: false, progress: 0, target: 1000 },
  { id: "early_bird", name: "Early Bird", description: "Complete a task before 8 AM", icon: "sunny", category: "speed", xpReward: 75, unlocked: false },
  { id: "night_owl", name: "Night Owl", description: "Complete a task after 10 PM", icon: "moon", category: "speed", xpReward: 75, unlocked: false },
  { id: "comeback_kid", name: "Comeback Kid", description: "Complete tasks after a day off", icon: "refresh-circle", category: "recovery", xpReward: 150, unlocked: false },
  { id: "perfect_planned", name: "Perfectly Planned", description: "Have 100% of tasks auto-scheduled", icon: "calendar", category: "scheduling", xpReward: 200, unlocked: false },
  { id: "squad_leader", name: "Squad Leader", description: "Create or lead a squad", icon: "people", category: "social", xpReward: 100, unlocked: false },
];
