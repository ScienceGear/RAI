import { Task, DiaryMessage } from "@/types";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:3000";

async function callAI(messages: Array<{ role: string; content: string }>, system?: string, maxTokens = 512): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, system, maxTokens }),
    });
    if (!response.ok) throw new Error("AI request failed");
    const data = await response.json() as { content: string };
    return data.content ?? "";
  } catch {
    return "";
  }
}

export async function parseTaskFromText(text: string, userContext?: {
  categories: string[];
  recentTasks: string[];
}): Promise<Partial<Task>> {
  const system = `You are a task parser for a productivity app. Extract structured task info from natural language.
Return ONLY valid JSON with these fields: title (string), estimatedMinutes (number), priority (1-4, 4=urgent), difficulty (1-5), deadline (ISO string or null), categoryPrimary (one of: Work, Learning, Health, Creative, Personal, Finance, Social, Side Project).
No explanation, only JSON.`;

  const contextStr = userContext
    ? `User context: categories used: ${userContext.categories.join(", ")}. Recent tasks: ${userContext.recentTasks.slice(0, 5).join(", ")}.`
    : "";

  const response = await callAI(
    [{ role: "user", content: `${contextStr}\n\nParse this task: "${text}"` }],
    system,
    256
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as Partial<Task>;
    }
  } catch {
  }

  return {};
}

export async function generateScheduleRationale(
  task: Task,
  scheduledTime: string,
  energyScore: number
): Promise<string> {
  const system = `You are RAI, an AI productivity coach. Generate a concise, encouraging one-sentence rationale (max 20 words) for why a task was scheduled at a specific time. Be specific and mention the energy data.`;

  const response = await callAI(
    [{
      role: "user",
      content: `Task: "${task.title}" | Category: ${task.categoryPrimary} | Scheduled: ${scheduledTime} | Energy score at that hour: ${energyScore}/100 | Priority: ${task.priority}/4`
    }],
    system,
    100
  );

  return response || `Scheduled at ${scheduledTime} — optimal for your energy pattern.`;
}

export async function chatWithDiary(
  messages: DiaryMessage[],
  userContext: { name: string; todayScore: number; recentMood: number }
): Promise<string> {
  const system = `You are RAI, a warm and insightful AI productivity coach and emotional support companion. You help users reflect on their day, celebrate wins, and process challenges with empathy.

User context: Name: ${userContext.name}, Today's focus score: ${userContext.todayScore}/100, Recent mood: ${userContext.recentMood}/5.

Be conversational, warm, specific, and concise. Reference their actual data when relevant. Max 3 sentences per response.`;

  const formattedMessages = messages.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return await callAI(formattedMessages, system, 300);
}

export async function generateConfidenceBoost(params: {
  name: string;
  streak: number;
  tasksCompleted: number;
  focusMinutes: number;
  motivation: string;
}): Promise<string> {
  const system = `You are RAI, an AI motivational coach. Generate a powerful, personalized affirmation (3-4 sentences) based on the user's real data. Be specific, warm, and energizing. Reference their actual achievements.`;

  return await callAI(
    [{
      role: "user",
      content: `Generate a confidence boost for ${params.name}. Stats: ${params.streak}-day streak, ${params.tasksCompleted} tasks completed, ${params.focusMinutes} focus minutes. Their motivation: "${params.motivation}".`
    }],
    system,
    200
  );
}

export async function generateAIInsight(params: {
  todayTasks: Task[];
  streak: number;
  focusScore: number;
  dangerHours: number[];
}): Promise<string> {
  const system = `You are RAI. Generate a 1-sentence smart insight about the user's productivity pattern. Be specific and actionable. Max 25 words.`;

  const upcomingTasks = params.todayTasks.filter((t) => !t.completed).slice(0, 3).map((t) => t.title).join(", ");

  return await callAI(
    [{
      role: "user",
      content: `Focus score: ${params.focusScore}/100. Streak: ${params.streak} days. Upcoming: ${upcomingTasks}. Danger hours: ${params.dangerHours.join(", ")}. Generate insight.`
    }],
    system,
    80
  );
}

export async function generateWeeklyReport(params: {
  name: string;
  tasksCompleted: number;
  focusHours: number;
  topCategory: string;
  streakDays: number;
  improvements: string[];
}): Promise<string> {
  const system = `You are RAI. Generate a warm, specific weekly performance summary in 3 sentences. Celebrate wins, note improvements, and end with one actionable suggestion.`;

  return await callAI(
    [{
      role: "user",
      content: `Weekly report for ${params.name}: ${params.tasksCompleted} tasks done, ${params.focusHours}h focused, top category: ${params.topCategory}, ${params.streakDays}-day streak. Improvements: ${params.improvements.join(", ")}.`
    }],
    system,
    250
  );
}

export interface SchedulerAction {
  type: "create_task" | "schedule_task" | "delete_task";
  task?: {
    title: string;
    estimatedMinutes: number;
    priority: number;
    difficulty: number;
    scheduledDate?: string;
    scheduledTime?: string;
    deadline?: string;
    categoryPrimary?: string;
    notes?: string;
  };
  taskId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

export async function chatWithScheduler(
  messages: Array<{ role: string; content: string }>,
  context: {
    profile: {
      firstName: string;
      chronotype: string;
      sleepStart: string;
      sleepEnd: string;
      preferredWorkHours: string[];
      primaryFocus: string;
      motivation: string;
      mainStruggle: string[];
      dailyCapacityMinutes: number;
    };
    tasks: Array<{
      id: string;
      title: string;
      scheduledDate?: string;
      scheduledTime?: string;
      deadline?: string;
      priority: number;
      categoryPrimary: string;
      completed: boolean;
    }>;
  }
): Promise<{ text: string; actions?: SchedulerAction[] }> {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const todayTasks = context.tasks.filter((t) => t.scheduledDate === today && !t.completed);
  const upcomingTasks = context.tasks
    .filter((t) => !t.completed && t.scheduledDate && t.scheduledDate >= today)
    .slice(0, 12)
    .map((t) => `  [${t.id.slice(0, 8)}] "${t.title}" — ${t.scheduledDate} ${t.scheduledTime ?? "no time"} (p${t.priority}, ${t.categoryPrimary})`)
    .join("\n");

  const system = `You are RAI, an elite AI productivity coach with FULL real-time access to ${context.profile.firstName}'s tasks and calendar.

USER PROFILE:
• Name: ${context.profile.firstName}
• Chronotype: ${context.profile.chronotype} | Best hours: ${context.profile.preferredWorkHours.join(", ")}
• Wake: ${context.profile.sleepEnd} | Bedtime: ${context.profile.sleepStart}
• Focus: ${context.profile.primaryFocus} | Motivation: ${context.profile.motivation}
• Struggles: ${context.profile.mainStruggle.join(", ")}
• Daily capacity: ${Math.round(context.profile.dailyCapacityMinutes / 60)}h

TODAY (${today}):
${todayTasks.length > 0 ? todayTasks.map((t) => `  "${t.title}" at ${t.scheduledTime ?? "TBD"}`).join("\n") : "  Nothing scheduled yet"}

UPCOMING TASKS (with IDs):
${upcomingTasks || "  None"}

DATE REFERENCE: today=${today}, tomorrow=${tomorrow}

RESPONSE RULES:
1. Reply in 1-3 warm, specific sentences.
2. When creating or scheduling tasks, append EXACTLY this on its own final line — no extra text after it:
   ACTIONS:[{"type":"create_task","task":{"title":"...","estimatedMinutes":30,"priority":2,"difficulty":2,"scheduledDate":"${today}","scheduledTime":"09:00","categoryPrimary":"Work"}}]
3. For MULTIPLE tasks (e.g. "plan my full day"), put all objects in ONE array:
   ACTIONS:[{...task1...},{...task2...},{...task3...}]
4. To reschedule an existing task: {"type":"schedule_task","taskId":"<8-char id>","scheduledDate":"${today}","scheduledTime":"15:00"}
5. Valid categoryPrimary values: Work, Learning, Health, Creative, Personal, Finance, Social, Side Project
6. Priority 1=low, 2=normal, 3=high, 4=urgent. Difficulty 1-5.
7. Respect the user's chronotype — don't schedule deep work during their low-energy hours.
8. If no scheduling is needed, OMIT the ACTIONS line entirely.`;

  const response = await callAI(messages, system, 600);

  let actions: SchedulerAction[] | undefined;
  let text = response;

  // Parse ACTIONS:[...] array format
  const arrMatch = response.match(/ACTIONS:(\[[\s\S]*?\])\s*$/m);
  if (arrMatch) {
    try {
      actions = JSON.parse(arrMatch[1]) as SchedulerAction[];
      text = response.slice(0, response.lastIndexOf("ACTIONS:")).trim();
    } catch {}
  }

  // Fallback: legacy single ACTION:{...} format
  if (!actions) {
    const objMatch = response.match(/ACTION:(\{[\s\S]*?\})\s*$/m);
    if (objMatch) {
      try {
        const single = JSON.parse(objMatch[1]) as SchedulerAction;
        actions = [single];
        text = response.slice(0, response.lastIndexOf("ACTION:")).trim();
      } catch {}
    }
  }

  return { text: text || "I'm here to help — tell me what to schedule!", actions };
}

export async function generateOnboardingSummary(answers: Record<string, unknown>): Promise<string> {
  const system = `You are RAI. Generate a warm, personalized 3-sentence profile summary for a new user based on their onboarding answers. Be encouraging and specific.`;

  return await callAI(
    [{
      role: "user",
      content: `Onboarding answers: ${JSON.stringify(answers)}`
    }],
    system,
    200
  );
}
