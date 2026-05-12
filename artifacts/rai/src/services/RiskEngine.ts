import { supabase } from "@/src/supabase/client";

export type RiskLevel = "low" | "watch" | "danger" | "critical";

export type RiskInput = {
  userId: string;
  pendingTasks: number;
  idleMinutes: number;
  mood: number | null;
  currentHour: number;
  dangerHours: number[];
};

export type RiskResult = {
  score: number;
  level: RiskLevel;
  recentDistractionMinutes: number;
};

async function getRecentDistractionMinutes(userId: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("screen_time_logs")
    .select("distraction_minutes")
    .eq("user_id", userId)
    .gte("logged_at", since);
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + Number((row as { distraction_minutes: number }).distraction_minutes ?? 0), 0);
}

async function getTopAppSignals(userId: string): Promise<{ packageName: string; distractionMinutes: number } | null> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("screen_time_logs")
    .select("package_name,distraction_minutes,total_time_ms")
    .eq("user_id", userId)
    .gte("logged_at", start.toISOString());

  if (error) throw error;

  const grouped = new Map<string, { packageName: string; distractionMinutes: number; totalTimeMs: number }>();
  for (const row of data ?? []) {
    const packageName = String((row as { package_name: string }).package_name ?? "");
    if (!packageName) continue;
    const distractionMinutes = Number((row as { distraction_minutes: number }).distraction_minutes ?? 0);
    const totalTimeMs = Number((row as { total_time_ms: number }).total_time_ms ?? 0);
    const current = grouped.get(packageName) ?? { packageName, distractionMinutes: 0, totalTimeMs: 0 };
    current.distractionMinutes += distractionMinutes;
    current.totalTimeMs += totalTimeMs;
    grouped.set(packageName, current);
  }

  const top = [...grouped.values()].sort((a, b) => b.totalTimeMs - a.totalTimeMs)[0];
  return top ? { packageName: top.packageName, distractionMinutes: top.distractionMinutes } : null;
}

function toRiskLevel(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 55) return "danger";
  if (score >= 35) return "watch";
  return "low";
}

export async function calculateRiskScore(input: RiskInput): Promise<RiskResult> {
  const [recentDistractionMinutes, topApp] = await Promise.all([
    getRecentDistractionMinutes(input.userId),
    getTopAppSignals(input.userId),
  ]);

  let score = 0;
  score += Math.min(20, input.pendingTasks * 3);
  score += Math.min(15, Math.max(0, input.idleMinutes - 15));
  if (input.mood !== null && input.mood <= 2) score += 15;

  const inDangerHour = input.dangerHours.includes(input.currentHour);
  const highDistractionUsage = recentDistractionMinutes >= 20;
  if (inDangerHour && highDistractionUsage) score += 25;
  if (
    topApp &&
    /instagram|youtube|facebook|chrome/i.test(topApp.packageName) &&
    topApp.distractionMinutes >= 20
  ) {
    score += 15;
  }

  score = Math.min(100, Math.max(0, score));
  return {
    score,
    level: toRiskLevel(score),
    recentDistractionMinutes,
  };
}
