/**
 * Smart predictions engine — combines screen time, focus sessions, mood logs,
 * and hourly patterns to predict danger zones and brain state in real time.
 */
import { FocusSession, MoodLog } from "@/types";
import { HourlyScreenTime, AppUsage } from "@/modules/usage-stats";
import { BrainState, BrainStateName } from "@/lib/brainstate";

export interface PredictionResult {
  refinedDangerHours: number[];
  predictedBrainState: BrainStateName | null;
  alertLevel: "none" | "watch" | "warning" | "critical";
  alertReason: string;
  screenDiagnostic: {
    totalMinutes: number;
    socialMinutes: number;
    entertainmentMinutes: number;
    topCategory: string;
    isHighRisk: boolean;
  };
  recommendation: string;
}

const SOCIAL_RISK_THRESHOLD = 60;
const TOTAL_RISK_THRESHOLD = 180;

export function computePredictions(params: {
  focusSessions: FocusSession[];
  moodLogs: MoodLog[];
  hourlyScreenTime: HourlyScreenTime[];
  appUsage: AppUsage[];
  currentBrainState: BrainState;
  dangerHours: number[];
}): PredictionResult {
  const { focusSessions, moodLogs, hourlyScreenTime, appUsage, currentBrainState, dangerHours } = params;

  // ── Screen time diagnostics ────────────────────────────────────────────────
  const totalScreenMinutes = hourlyScreenTime.reduce((a, h) => a + h.totalMinutes, 0);
  const socialMinutes = appUsage
    .filter((a) => a.category === "social")
    .reduce((a, x) => a + x.totalMinutes, 0);
  const entertainmentMinutes = appUsage
    .filter((a) => a.category === "entertainment")
    .reduce((a, x) => a + x.totalMinutes, 0);

  const topApp = appUsage.sort((a, b) => b.totalMinutes - a.totalMinutes)[0];
  const topCategory = topApp?.category ?? "other";
  const isHighRisk = socialMinutes > SOCIAL_RISK_THRESHOLD || totalScreenMinutes > TOTAL_RISK_THRESHOLD;

  // ── Screen-time-informed danger hours ────────────────────────────────────
  // Hours where screen time was high AND focus was low → extra dangerous
  const focusHourMap: number[] = new Array(24).fill(0);
  focusSessions.forEach((s) => {
    const h = new Date(s.startedAt).getHours();
    focusHourMap[h] += s.completedMinutes;
  });
  const peakFocusMinutes = Math.max(...focusHourMap, 1);

  const screenInformedDangerHours = hourlyScreenTime
    .filter((h) => {
      const focusAtHour = focusHourMap[h.hour] ?? 0;
      const focusFraction = focusAtHour / peakFocusMinutes;
      // High screen time + low focus relative to peak = danger
      return h.totalMinutes > 20 && focusFraction < 0.25;
    })
    .map((h) => h.hour);

  // Merge with existing danger hours, deduplicate, take top 6
  const refinedDangerHours = [
    ...new Set([...dangerHours, ...screenInformedDangerHours]),
  ].slice(0, 6);

  // ── Brain state prediction from screen time ───────────────────────────────
  let predictedBrainState: BrainStateName | null = null;
  let alertLevel: PredictionResult["alertLevel"] = "none";
  let alertReason = "";
  let recommendation = "";

  if (socialMinutes > 120 || entertainmentMinutes > 90) {
    predictedBrainState = "brainrot";
    alertLevel = "critical";
    alertReason = `${socialMinutes + entertainmentMinutes} min on distracting apps today`;
    recommendation = "Put your phone face-down and start a 25-min Pomodoro session immediately.";
  } else if (socialMinutes > 60 || totalScreenMinutes > 180) {
    predictedBrainState = "brain_fog";
    alertLevel = "warning";
    alertReason = "High screen time is clouding your focus capacity";
    recommendation = "Take a 10-min screen break, then open a focus session.";
  } else if (totalScreenMinutes > 120) {
    alertLevel = "watch";
    alertReason = "Screen time trending high";
    recommendation = "Cap device use now to protect your afternoon focus window.";
  }

  // Override if current brain state is already very good — don't warn unnecessarily
  if (currentBrainState.score >= 75 && alertLevel === "watch") {
    alertLevel = "none";
    alertReason = "";
    recommendation = "";
  }

  // Low mood + high screen time = brainrot signal
  const recentMoods = moodLogs
    .filter((m) => Date.now() - new Date(m.timestamp).getTime() < 3 * 3600 * 1000)
    .map((m) => m.mood);
  const avgRecentMood = recentMoods.length > 0
    ? recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length
    : null;

  if (avgRecentMood !== null && avgRecentMood <= 2 && socialMinutes > 45) {
    predictedBrainState = "brainrot";
    alertLevel = "critical";
    alertReason = "Low mood + high social media = attention spiral";
    recommendation = "Voice journal your feelings, then commit to 1 task for 25 minutes.";
  }

  if (!recommendation) {
    if (currentBrainState.name === "flow_state") {
      recommendation = "You're in flow — protect this time and decline interruptions.";
    } else if (currentBrainState.name === "sharp" || currentBrainState.name === "in_the_zone") {
      recommendation = "Good cognitive state. Tackle your hardest task now.";
    } else {
      recommendation = "Start small — one task, one session. Momentum builds itself.";
    }
  }

  return {
    refinedDangerHours,
    predictedBrainState,
    alertLevel,
    alertReason,
    screenDiagnostic: {
      totalMinutes: totalScreenMinutes,
      socialMinutes,
      entertainmentMinutes,
      topCategory,
      isHighRisk,
    },
    recommendation,
  };
}

/**
 * Feature ideas RAI can suggest based on available data richness:
 */
export function getSuggestedFeatures(params: {
  hasFocusSessions: boolean;
  hasMoodLogs: boolean;
  hasScreenTime: boolean;
  hasSquad: boolean;
  sessionCount: number;
}): { title: string; description: string; icon: string; priority: number }[] {
  const { hasFocusSessions, hasMoodLogs, hasScreenTime, hasSquad, sessionCount } = params;
  const features = [];

  if (hasScreenTime && hasFocusSessions) {
    features.push({
      title: "App Blocker",
      description: "Block distracting apps during focus sessions with voice commitment gates",
      icon: "shield-checkmark",
      priority: 1,
    });
    features.push({
      title: "Focus-Aware Blocking",
      description: "Auto-block social apps whenever a focus timer is running",
      icon: "timer",
      priority: 2,
    });
  }
  if (hasMoodLogs && sessionCount >= 5) {
    features.push({
      title: "Mood-Productivity Correlation",
      description: "See exactly which mood states predict your peak output hours",
      icon: "analytics",
      priority: 3,
    });
  }
  if (hasFocusSessions && sessionCount >= 10) {
    features.push({
      title: "Weekly RAI Report",
      description: "Automated weekly summary of your productivity patterns and trends",
      icon: "document-text",
      priority: 4,
    });
  }
  if (hasSquad) {
    features.push({
      title: "Squad Danger Alerts",
      description: "Notify squad members when you enter a danger zone so they can check on you",
      icon: "people",
      priority: 5,
    });
  }
  features.push({
    title: "Sleep Pattern Sync",
    description: "Correlate late-night phone pickups with next-day focus scores",
    icon: "moon",
    priority: 6,
  });
  features.push({
    title: "Pomodoro Smart Suggestions",
    description: "RAI picks your next task automatically based on energy level and deadline",
    icon: "bulb",
    priority: 7,
  });

  return features.sort((a, b) => a.priority - b.priority);
}
