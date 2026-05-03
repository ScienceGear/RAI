import { FocusSession, MoodLog, Task } from "@/types";

export type BrainStateName =
  | "flow_state"
  | "sharp"
  | "in_the_zone"
  | "brain_fog"
  | "brainrot"
  | "tired"
  | "waking_up"
  | "recovering";

export interface BrainState {
  name: BrainStateName;
  label: string;
  emoji: string;
  description: string;
  color: string;
  /** 0–100, higher = better cognitive state */
  score: number;
}

const STATES: Record<BrainStateName, Omit<BrainState, "score" | "name">> = {
  flow_state:   { label: "Flow State",   emoji: "⚡", description: "Deep focus, peak performance", color: "#6366F1" },
  sharp:        { label: "Sharp",        emoji: "🎯", description: "Mentally clear and on point",  color: "#10B981" },
  in_the_zone:  { label: "In The Zone",  emoji: "🔥", description: "Locked in, productive mode",   color: "#F97316" },
  brain_fog:    { label: "Brain Fog",    emoji: "🌫️", description: "Low clarity, take it slow",    color: "#9CA3AF" },
  brainrot:     { label: "Brainrot",     emoji: "😵", description: "Too many distractions today",  color: "#EF4444" },
  tired:        { label: "Tired",        emoji: "😴", description: "Low energy, rest if you can",   color: "#8B5CF6" },
  waking_up:    { label: "Waking Up",    emoji: "☕", description: "Getting started, be patient",   color: "#F59E0B" },
  recovering:   { label: "Recovering",   emoji: "🌱", description: "Bouncing back, stay steady",   color: "#3B82F6" },
};

export function computeBrainState(params: {
  focusSessions: FocusSession[];
  moodLogs: MoodLog[];
  tasks: Task[];
  todayFocusScore: number;
  streak: number;
}): BrainState {
  const { focusSessions, moodLogs, tasks, todayFocusScore, streak } = params;
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const hour = now.getHours();

  // Today's data
  const todayFocusMins = focusSessions
    .filter((s) => s.startedAt.startsWith(todayStr))
    .reduce((a, s) => a + s.completedMinutes, 0);

  const todayTasks = tasks.filter((t) => t.scheduledDate === todayStr);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const completionRate = todayTasks.length > 0 ? completedToday / todayTasks.length : 0;

  // Latest mood (within last 4 hours)
  const recentMood = moodLogs
    .filter((m) => Date.now() - new Date(m.timestamp).getTime() < 4 * 3600 * 1000)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  const moodScore = recentMood ? recentMood.mood * 20 : 60; // default 60 if no mood

  // Week trend
  const last7FocusMins = focusSessions
    .filter((s) => {
      const d = new Date(s.startedAt);
      return Date.now() - d.getTime() < 7 * 86400000;
    })
    .reduce((a, s) => a + s.completedMinutes, 0);

  // Compute raw brain score (0–100)
  let score = 0;
  score += Math.min(30, todayFocusMins * 0.5);      // up to 30 pts from focus time
  score += Math.min(20, completionRate * 20);          // up to 20 pts from task completion
  score += (moodScore / 100) * 20;                     // up to 20 pts from mood
  score += Math.min(15, streak * 1.5);                 // up to 15 pts from streak
  score += Math.min(15, (todayFocusScore / 100) * 15); // up to 15 pts from focus score
  score = Math.round(score);

  // Contextual adjustments
  let name: BrainStateName;

  if (hour < 7) {
    name = "tired"; // pre-dawn
  } else if (hour < 9 && todayFocusMins < 10) {
    name = "waking_up";
  } else if (score >= 75 && todayFocusMins >= 45) {
    name = "flow_state";
  } else if (score >= 65 && completionRate >= 0.5) {
    name = "in_the_zone";
  } else if (score >= 55) {
    name = "sharp";
  } else if (moodScore <= 40 && todayFocusMins < 20) {
    name = "brainrot";
  } else if (score < 35 || (hour >= 21 && todayFocusMins < 10)) {
    name = "tired";
  } else if (streak === 0 && last7FocusMins < 30) {
    name = "recovering";
  } else {
    name = "brain_fog";
  }

  return { name, score, ...STATES[name] };
}

/**
 * Compute danger hours from actual usage patterns.
 * Danger hours = hours where focus sessions are rarely started (historically low productivity).
 */
export function computeDangerZoneHours(focusSessions: FocusSession[], moodLogs: MoodLog[]): number[] {
  if (focusSessions.length < 5) {
    // Not enough data — return typical distraction hours
    return [14, 15, 22, 23];
  }

  // Count productive activity per hour
  const hourProductivity: Record<number, { sessions: number; minutes: number; count: number }> = {};
  for (let h = 0; h < 24; h++) {
    hourProductivity[h] = { sessions: 0, minutes: 0, count: 0 };
  }

  focusSessions.forEach((s) => {
    const h = new Date(s.startedAt).getHours();
    hourProductivity[h].sessions += 1;
    hourProductivity[h].minutes += s.completedMinutes;
    hourProductivity[h].count += 1;
  });

  // Mood penalty for low-mood hours
  moodLogs.forEach((m) => {
    const h = new Date(m.timestamp).getHours();
    if (hourProductivity[h] && m.mood <= 2) {
      hourProductivity[h].sessions -= 0.5; // treat low mood as negative signal
    }
  });

  // Hours with zero sessions are candidates; also score-rank all hours
  const activeHours = Object.values(hourProductivity).filter((h) => h.count > 0);
  if (activeHours.length === 0) return [14, 15, 22, 23];

  const avgMinutes = activeHours.reduce((a, h) => a + h.minutes, 0) / activeHours.length;

  const dangerHours: number[] = [];
  for (let h = 0; h < 24; h++) {
    const data = hourProductivity[h];
    // Skip sleep hours (0–5)
    if (h >= 0 && h < 6) continue;
    // Mark as danger if: zero sessions ever OR significantly below average
    if (data.sessions <= 0 || (data.count > 0 && data.minutes < avgMinutes * 0.4)) {
      dangerHours.push(h);
    }
  }

  // Cap at 6 danger hours, prefer historically worst
  return dangerHours.slice(0, 6);
}

/**
 * Get the list of "distraction patterns" based on most-skipped task times.
 */
export function computeDistractionPatterns(tasks: Task[], focusSessions: FocusSession[]): string[] {
  // Without real app usage data, infer from skipped task patterns by hour
  const skipsByHour: Record<number, number> = {};
  tasks.forEach((t) => {
    if (t.skippedCount > 0 && t.scheduledTime) {
      const h = parseInt(t.scheduledTime.split(":")[0], 10);
      skipsByHour[h] = (skipsByHour[h] ?? 0) + t.skippedCount;
    }
  });
  const worstHours = Object.entries(skipsByHour)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => `${h}:00–${parseInt(h, 10) + 1}:00`);

  if (worstHours.length === 0) {
    return ["After lunch (13–15h)", "Evening scroll (20–23h)", "Late night (22–0h)"];
  }
  return worstHours;
}
