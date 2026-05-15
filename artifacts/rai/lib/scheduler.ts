import { Task, UserProfile, EnergyProfile } from "@/types";

interface TimeSlot {
  date: string;
  startMinute: number;
  durationMinutes: number;
  score: number;
}

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function dateStr(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

export function autoScheduleTask(
  newTask: Task,
  existingTasks: Task[],
  profile: UserProfile
): { scheduledDate: string; scheduledTime: string; rationale: string } | null {
  const daysToSearch = 7;
  const candidates: TimeSlot[] = [];

  for (let day = 0; day < daysToSearch; day++) {
    const date = dateStr(day);
    const daySlots = generateDaySlots(date, newTask, existingTasks, profile);
    candidates.push(...daySlots);
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  const rationale = buildRationale(newTask, best, profile);

  return {
    scheduledDate: best.date,
    scheduledTime: formatTime(best.startMinute),
    rationale,
  };
}

function generateDaySlots(
  date: string,
  task: Task,
  existingTasks: Task[],
  profile: UserProfile
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const dayTasks = existingTasks.filter((t) => t.scheduledDate === date && !t.completed);

  const sleepStart = parseTime(profile.sleepStart);
  const sleepEnd = parseTime(profile.sleepEnd);
  const wakeTime = (sleepEnd + profile.wakeBuffer) % (24 * 60);
  const windDownStart = sleepStart - profile.sleepBuffer;

  const blockedRanges: Array<[number, number]> = [];

  if (sleepEnd < sleepStart) {
    blockedRanges.push([0, sleepEnd]);
    blockedRanges.push([sleepStart, 24 * 60]);
  } else {
    blockedRanges.push([sleepStart, 24 * 60]);
    blockedRanges.push([0, sleepEnd]);
  }

  for (const meal of profile.mealTimes) {
    const start = parseTime(meal.start);
    blockedRanges.push([start, start + meal.duration]);
  }

  for (const t of dayTasks) {
    if (t.scheduledTime) {
      const start = parseTime(t.scheduledTime);
      const buffer = 15;
      blockedRanges.push([start - buffer, start + t.estimatedMinutes + buffer]);
    }
  }

  const step = 15;
  const needed = task.estimatedMinutes;

  for (let startMin = wakeTime; startMin < windDownStart - needed; startMin += step) {
    const endMin = startMin + needed;
    if (endMin > windDownStart) break;

    const blocked = blockedRanges.some(([s, e]) => startMin < e && endMin > s);
    if (blocked) continue;

    const hour = Math.floor(startMin / 60);
    const score = scoreSlot(hour, date, task, profile, dayTasks);
    slots.push({ date, startMinute: startMin, durationMinutes: needed, score });
  }

  return slots;
}

function scoreSlot(
  hour: number,
  date: string,
  task: Task,
  profile: UserProfile,
  dayTasks: Task[]
): number {
  let score = 50;

  const energyScore = profile.energyProfile.energyByHour[hour] ?? 50;
  score += (energyScore / 100) * 40;

  const preferred = profile.preferredWorkHours;
  const isPreferred = preferred.some((range) => {
    const [start, end] = range.split("-").map(parseTime);
    return hour * 60 >= start && hour * 60 < end;
  });
  if (isPreferred) score += 15;

  const dangerHourBoost = getDangerPenalty(hour, profile);
  score += dangerHourBoost;

  const priorityBonus: Record<number, number> = { 4: 25, 3: 10, 2: 0, 1: -10 };
  score += priorityBonus[task.priority] ?? 0;

  if (task.deadline) {
    const deadlineDate = new Date(task.deadline);
    const slotDate = new Date(date);
    const daysUntilDeadline = Math.max(
      0,
      Math.floor((deadlineDate.getTime() - slotDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    if (daysUntilDeadline === 0) score += 30;
    else if (daysUntilDeadline === 1) score += 20;
    else if (daysUntilDeadline <= 3) score += 10;
  }

  const adjacentTasks = dayTasks.filter((t) => {
    if (!t.scheduledTime) return false;
    const tHour = parseTime(t.scheduledTime) / 60;
    return Math.abs(tHour - hour) <= 1;
  });

  for (const adj of adjacentTasks) {
    if (adj.categoryPrimary === task.categoryPrimary) score += 5;
    else score -= 8;
  }

  return Math.max(0, Math.min(100, score));
}

function getDangerPenalty(hour: number, profile: UserProfile): number {
  const isDanger = false;
  return isDanger ? -20 : 0;
}

function buildRationale(task: Task, slot: TimeSlot, profile: UserProfile): string {
  const hour = Math.floor(slot.startMinute / 60);
  const timeLabel = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const energyScore = profile.energyProfile.energyByHour[hour] ?? 50;

  if (energyScore > 70) {
    return `Placed at ${formatTime(slot.startMinute)} — this is your highest energy window for ${timeLabel} tasks. You're ${Math.round(energyScore)}% more likely to complete tasks at this hour.`;
  }

  if (task.priority === 4) {
    return `Scheduled urgently at ${formatTime(slot.startMinute)} — this task is marked Urgent and needs your earliest available slot.`;
  }

  return `Placed at ${formatTime(slot.startMinute)} — best available slot balancing your energy, existing schedule, and task priority.`;
}

export function detectOverload(tasks: Task[], profile: UserProfile): {
  isOverloaded: boolean;
  capacityPercent: number;
  suggestion: string;
} {
  const todayTasks = tasks.filter((t) => t.scheduledDate === todayStr() && !t.completed);
  const totalMinutes = todayTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
  const capacityPercent = (totalMinutes / profile.dailyCapacityMinutes) * 100;

  if (capacityPercent > 85) {
    const lowestPriority = todayTasks.sort((a, b) => a.priority - b.priority)[0];
    return {
      isOverloaded: true,
      capacityPercent,
      suggestion: `Your day is at ${Math.round(capacityPercent)}% capacity. Consider removing "${lowestPriority?.title ?? "a low priority task"}".`,
    };
  }

  return { isOverloaded: false, capacityPercent, suggestion: "" };
}

export function splitLongTask(task: Task): Task[] {
  const maxSession = task.difficulty >= 4 ? 90 : 120;
  if (task.estimatedMinutes <= maxSession) return [task];

  const sessions: Task[] = [];
  let remaining = task.estimatedMinutes;
  let sessionNum = 1;

  while (remaining > 0) {
    const sessionDuration = Math.min(remaining, maxSession);
    sessions.push({
      ...task,
      id: `${task.id}_s${sessionNum}`,
      title: `${task.title} (Part ${sessionNum})`,
      estimatedMinutes: sessionDuration,
      parentRecurringId: task.id,
    });
    remaining -= sessionDuration;
    sessionNum++;
  }

  return sessions;
}

export function getDefaultEnergyProfile(chronotype: string): EnergyProfile {
  const baseEnergy: Record<number, number> = {};

  for (let h = 0; h < 24; h++) {
    if (h < 5) baseEnergy[h] = 10;
    else if (h < 7) baseEnergy[h] = 30;
    else if (h < 9) {
      baseEnergy[h] = chronotype === "morning" ? 85 : chronotype === "evening" ? 40 : 65;
    } else if (h < 12) {
      baseEnergy[h] = chronotype === "morning" ? 90 : 75;
    } else if (h < 14) baseEnergy[h] = 60;
    else if (h < 16) baseEnergy[h] = 50;
    else if (h < 19) {
      baseEnergy[h] = chronotype === "evening" ? 85 : 70;
    } else if (h < 21) {
      baseEnergy[h] = chronotype === "evening" ? 80 : 55;
    } else if (h < 23) baseEnergy[h] = 40;
    else baseEnergy[h] = 20;
  }

  return {
    energyByHour: baseEnergy,
    categoryBestHours: {},
    chronotype: chronotype as "morning" | "intermediate" | "evening",
    durationAccuracyFactor: 1.0,
    weakDays: [],
  };
}
