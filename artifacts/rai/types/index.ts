export type TaskCategory =
  | "Work"
  | "Learning"
  | "Health"
  | "Creative"
  | "Personal"
  | "Finance"
  | "Social"
  | "Side Project"
  | string;

export type TaskPriority = 1 | 2 | 3 | 4;
export type TaskDifficulty = 1 | 2 | 3 | 4 | 5;
export type MoodLevel = 1 | 2 | 3 | 4 | 5;
export type Theme = "dark" | "light" | "amoled" | "system";
export type PrimaryFocus =
  | "studying"
  | "work"
  | "freelancing"
  | "building"
  | "health"
  | "personal_growth"
  | "mixed";
export type Chronotype = "morning" | "intermediate" | "evening";
export type TimerMode = "pomodoro" | "deep" | "ultra";

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "weekdays" | "custom";
  daysOfWeek?: number[];
  endDate?: string;
  skipDates?: string[];
}

export interface TaskSession {
  id: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  categoryPrimary: TaskCategory;
  categorySecondary?: string;
  categoryOverridden: boolean;
  estimatedMinutes: number;
  actualMinutes?: number;
  deadline?: string;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  moodSensitive: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  sessions: TaskSession[];
  completed: boolean;
  completedAt?: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  parentRecurringId?: string;
  dependencies: string[];
  isQuickTask: boolean;
  notes?: string;
  voiceTranscript?: string;
  schedulerRationale?: string;
  skippedCount: number;
  moodAtSkip?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MealSlot {
  name: string;
  start: string;
  duration: number;
}

export interface EnergyProfile {
  energyByHour: Record<number, number>;
  categoryBestHours: Partial<Record<TaskCategory, number[]>>;
  chronotype: Chronotype;
  durationAccuracyFactor: number;
  weakDays: string[];
}

export interface AIMemoryFact {
  id: string;
  fact: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  firstName: string;
  email: string;
  avatarUrl?: string;
  primaryFocus: PrimaryFocus;
  goalType?: string;
  mainStruggle: string[];
  motivation: string;
  chronotype: Chronotype;
  sleepStart: string;
  sleepEnd: string;
  wakeBuffer: number;
  sleepBuffer: number;
  mealTimes: MealSlot[];
  preferredWorkHours: string[];
  dailyCapacityMinutes: number;
  energyProfile: EnergyProfile;
  durationAccuracyFactor: number;
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
  raiScore: number;
  onboardingComplete: boolean;
  theme: Theme;
  aiMemory: AIMemoryFact[];
  notificationsGranted: boolean;
  usageStatsGranted: boolean;
  accessibilityGranted: boolean;
  microphoneGranted: boolean;
}

export interface DangerZoneProfile {
  dangerHours: number[];
  topDistractionApps: string[];
  weakestDayOfWeek: number;
  doomLoopSequences: string[][];
  dataPointsCount: number;
  isBootstrapEstimate: boolean;
  lastComputedAt: string;
}

export interface SquadMember {
  id: string;
  name: string;
  avatarUrl?: string;
  raiScore: number;
  xp: number;
  streak: number;
  lastActive: string;
}

export interface Squad {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  members: SquadMember[];
  weeklyChallenge?: {
    description: string;
    targetHours: number;
    currentHours: number;
    endDate: string;
  };
}

export interface ActivityFeedItem {
  id: string;
  userId: string;
  userName: string;
  actionType: "task_complete" | "streak" | "focus_session" | "score_milestone" | "achievement";
  actionData: Record<string, unknown>;
  createdAt: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  messages: DiaryMessage[];
  mood?: MoodLevel;
  aiSummary?: string;
  userRating?: number;
  aiRating?: number;
  createdAt: string;
}

export interface DiaryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Goal {
  id: string;
  title: string;
  type: string;
  deadline: string;
  milestones: Milestone[];
  progress: number;
  categoryBreakdown: Record<TaskCategory, { target: number; actual: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  order: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "consistency" | "focus" | "speed" | "social" | "milestones" | "recovery" | "scheduling";
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

export interface MoodLog {
  id: string;
  mood: MoodLevel;
  tags: string[];
  timestamp: string;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  taskTitle: string;
  category?: TaskCategory;
  mode: TimerMode;
  durationMinutes: number;
  completedMinutes: number;
  completed: boolean;
  xpEarned: number;
  startedAt: string;
  endedAt?: string;
}
