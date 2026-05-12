import { supabase } from "@/src/supabase/client";

export async function calculateDangerZonesFromScreenTime(userId: string): Promise<number[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("screen_time_logs")
    .select("hour_bucket,distraction_minutes")
    .eq("user_id", userId)
    .gte("logged_at", since);

  if (error) throw error;

  const minutesByHour = new Array<number>(24).fill(0);
  for (const row of data ?? []) {
    const h = Number((row as { hour_bucket: number }).hour_bucket);
    const minutes = Number((row as { distraction_minutes: number }).distraction_minutes ?? 0);
    if (Number.isFinite(h) && h >= 0 && h <= 23) minutesByHour[h] += minutes;
  }

  const dangerHours = minutesByHour
    .map((minutes, hour) => ({ hour, minutes }))
    .filter((item) => item.minutes > 20)
    .map((item) => item.hour)
    .sort((a, b) => a - b);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ danger_hours: dangerHours })
    .eq("id", userId);
  if (profileError) throw profileError;

  return dangerHours;
}
