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
 * Format hour (0-23) as readable AM/PM label, e.g. 14 → "2 PM"
 */
export function fmtHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/**
 * Convert an array of hours into human-readable time ranges.
 * e.g. [14, 15, 22, 23] → "2–4 PM · 10 PM–12 AM"
 */
export function formatDangerHours(hours: number[]): string {
  if (hours.length === 0) return "None detected";
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  let start = sorted[0], end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) { end = sorted[i]; }
    else { ranges.push([start, end]); start = sorted[i]; end = sorted[i]; }
  }
  ranges.push([start, end]);

  return ranges.map(([s, e]) => {
    const startLabel = fmtHour(s);
    const endH = e + 1;
    const endLabel = endH === 24 ? "12 AM" : fmtHour(endH);
    // Same period (both AM or both PM) — shorten: "2–4 PM" instead of "2 PM–4 PM"
    const sPeriod = s < 12 ? "AM" : "PM";
    const ePeriod = endH < 12 ? "AM" : (endH === 24 ? "AM" : "PM");
    if (s === e) return startLabel;
    if (sPeriod === ePeriod) {
      const sNum = s === 0 ? 12 : s <= 12 ? s : s - 12;
      const eNum = endH === 0 ? 12 : endH <= 12 ? endH : endH - 12;
      return `${sNum}–${eNum} ${sPeriod}`;
    }
    return `${startLabel}–${endLabel}`;
  }).join(" · ");
}

/**
 * Compute danger hours from actual focus session patterns.
 * Strategy: only mark hours where the user HAS worked before but was low-output.
 * Never marks hours the user simply doesn't work (e.g., 3 AM).
 */
export function computeDangerZoneHours(focusSessions: FocusSession[], moodLogs: MoodLog[]): number[] {
  if (focusSessions.length < 5) {
    return [14, 15, 22, 23]; // sensible bootstrap defaults
  }

  // Accumulate focus minutes per hour across all history
  const hourMinutes: number[] = new Array(24).fill(0);
  const hourCount: number[] = new Array(24).fill(0);

  focusSessions.forEach((s) => {
    const h = new Date(s.startedAt).getHours();
    hourMinutes[h] += s.completedMinutes;
    hourCount[h] += 1;
  });

  // Hours the user actually works (at least 1 session ever)
  const workedHours = Array.from({ length: 24 }, (_, h) => h).filter(
    (h) => hourCount[h] > 0
  );
  if (workedHours.length === 0) return [14, 15, 22, 23];

  // Peak output hour as reference
  const peakMinutes = Math.max(...workedHours.map((h) => hourMinutes[h]));
  if (peakMinutes === 0) return [14, 15, 22, 23];

  // Danger = worked before but productivity < 30% of peak
  let dangerHours = workedHours
    .filter((h) => hourMinutes[h] < peakMinutes * 0.3)
    .sort((a, b) => hourMinutes[a] - hourMinutes[b]) // worst first
    .slice(0, 4);

  // Also add low-mood hours that overlap with worked hours
  const lowMoodHours = moodLogs
    .filter((m) => m.mood <= 2)
    .map((m) => new Date(m.timestamp).getHours())
    .filter((h) => workedHours.includes(h) && !dangerHours.includes(h));

  dangerHours = [...new Set([...dangerHours, ...lowMoodHours])].slice(0, 6);
  return dangerHours.length > 0 ? dangerHours : [14, 15];
}

/**
 * Compute per-hour productivity score (0–100) across all history — useful for heatmap.
 */
export function computeHourlyProductivity(focusSessions: FocusSession[]): number[] {
  const hourMinutes: number[] = new Array(24).fill(0);
  focusSessions.forEach((s) => {
    const h = new Date(s.startedAt).getHours();
    hourMinutes[h] += s.completedMinutes;
  });
  const peak = Math.max(...hourMinutes, 1);
  return hourMinutes.map((m) => Math.round((m / peak) * 100));
}

/**
 * Get the list of distraction time windows from skipped task patterns.
 */
export function computeDistractionPatterns(tasks: Task[], _focusSessions: FocusSession[]): string[] {
  const skipsByHour: Record<number, number> = {};
  tasks.forEach((t) => {
    if (t.skippedCount > 0 && t.scheduledTime) {
      const h = parseInt(t.scheduledTime.split(":")[0], 10);
      if (!isNaN(h)) skipsByHour[h] = (skipsByHour[h] ?? 0) + t.skippedCount;
    }
  });
  const worstHours = Object.entries(skipsByHour)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => formatDangerHours([parseInt(h, 10)]));

  return worstHours.length > 0
    ? worstHours
    : ["After lunch (1–3 PM)", "Evening scroll (8–11 PM)", "Late night (10 PM–12 AM)"];
}
