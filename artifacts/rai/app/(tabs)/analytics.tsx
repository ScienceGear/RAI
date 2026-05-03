import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  Alert, AppState, Modal, ActivityIndicator,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { ProgressRing } from "@/components/ProgressRing";
import { getRaiScoreTier, getCategoryColor } from "@/constants/categories";
import { xpToNextLevel, getLevelTitle } from "@/lib/xp";
import { formatDangerHours, computeHourlyProductivity } from "@/lib/brainstate";
import { UsageStats, AppUsage, HourlyScreenTime } from "@/modules/usage-stats";
import { scheduleSmartAlerts } from "@/lib/notifications";

type Tab = "score" | "screentime" | "productivity";

const CATEGORY_COLORS: Record<string, string> = {
  social: "#EF4444",
  entertainment: "#F97316",
  games: "#8B5CF6",
  browser: "#EAB308",
  other: "#6366F1",
};

const CATEGORY_LABELS: Record<string, string> = {
  social: "Social",
  entertainment: "Entertainment",
  games: "Games",
  browser: "Browser",
  other: "Other",
};

function fmtTime(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmtHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function hashColor(str: string): string {
  const palette = ["#6366F1", "#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B", "#F97316", "#EF4444"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function AppIcon({ app, size = 36 }: { app: AppUsage; size?: number }) {
  const fallbackColor = hashColor(app.packageName);
  if (app.iconBase64) {
    return (
      <ExpoImage
        source={{ uri: `data:image/png;base64,${app.iconBase64}` }}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.22,
      backgroundColor: fallbackColor + "33", alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ fontSize: size * 0.44, fontFamily: "Inter_700Bold", color: fallbackColor }}>
        {app.appName[0]?.toUpperCase() ?? "?"}
      </Text>
    </View>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ height: 5, flex: 1, backgroundColor: "#1E1E2E", borderRadius: 3, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, tasks, focusSessions, dangerZone, brainState, todayFocusScore, updateProfile } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>("score");

  // ── Usage permission state ────────────────────────────────────────────────
  const [usagePermission, setUsagePermission] = useState<"granted" | "denied" | "unavailable">(
    UsageStats.isAvailable() ? (UsageStats.hasPermission() ? "granted" : "denied") : "unavailable"
  );
  const appStateRef = useRef(AppState.currentState);

  // Re-check permission when returning from settings
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        if (UsageStats.isAvailable()) {
          const granted = UsageStats.hasPermission();
          setUsagePermission(granted ? "granted" : "denied");
          if (granted && !profile.usageStatsGranted) {
            updateProfile({ usageStatsGranted: true });
          }
        }
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [profile.usageStatsGranted]);

  // ── Day picker state ──────────────────────────────────────────────────────
  const [selectedDayOffset, setSelectedDayOffset] = useState(0); // 0 = today
  const [dayUsage, setDayUsage] = useState<AppUsage[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyScreenTime[]>([]);
  const [unlockCount, setUnlockCount] = useState(0);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppUsage | null>(null);
  const [showAppDetail, setShowAppDetail] = useState(false);
  const alertsSentRef = useRef(false);

  // Load usage data for selected day
  useEffect(() => {
    if (usagePermission !== "granted") return;
    alertsSentRef.current = false;
    setLoadingUsage(true);
    setDayUsage([]);
    setHourlyData([]);
    setUnlockCount(0);

    const d = new Date();
    d.setDate(d.getDate() - selectedDayOffset);
    d.setHours(0, 0, 0, 0);
    const startMs = d.getTime();
    const endMs = startMs + 86_400_000;

    Promise.all([
      UsageStats.getUsageForDate(startMs),
      UsageStats.getHourlyScreenTimeForDate(startMs),
      UsageStats.getUnlockCount(startMs, endMs),
    ]).then(([usage, hourly, unlocks]) => {
      setDayUsage(usage);
      setHourlyData(hourly);
      setUnlockCount(unlocks);
    }).finally(() => setLoadingUsage(false));
  }, [usagePermission, selectedDayOffset]);

  // Auto-compute danger zone and fire smart alerts from real usage
  useEffect(() => {
    if (hourlyData.length === 0 || selectedDayOffset !== 0 || alertsSentRef.current) return;
    alertsSentRef.current = true;

    const realDangerHours = hourlyData
      .filter((h) => h.totalMinutes >= 15 && h.hour >= 6)
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 4)
      .map((h) => h.hour)
      .sort((a, b) => a - b);

    const totalScreenMins = dayUsage.reduce((s, a) => s + a.totalMinutes, 0);
    const socialMins = dayUsage
      .filter((a) => a.category === "social" || a.category === "entertainment" || a.category === "games")
      .reduce((s, a) => s + a.totalMinutes, 0);

    if (profile.dangerZoneAlertsEnabled && profile.notificationsGranted) {
      scheduleSmartAlerts({
        dangerHours: realDangerHours.length > 0 ? realDangerHours : dangerZone.dangerHours,
        brainStateName: brainState.label,
        totalScreenMinutes: totalScreenMins,
        socialMinutes: socialMins,
      });
    }
  }, [hourlyData, dayUsage, selectedDayOffset]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const scoreTier = getRaiScoreTier(profile.raiScore);
  const xpInfo = xpToNextLevel(profile.xp);
  const levelTitle = getLevelTitle(profile.level);

  const totalScreenMins = useMemo(() => dayUsage.reduce((s, a) => s + a.totalMinutes, 0), [dayUsage]);
  const totalOpenCount = useMemo(() => dayUsage.reduce((s, a) => s + a.openCount, 0), [dayUsage]);
  const maxHourMins = useMemo(() => Math.max(...hourlyData.map((h) => h.totalMinutes), 1), [hourlyData]);

  const computedDangerHours = useMemo(() => {
    if (hourlyData.length === 0) return dangerZone.dangerHours;
    return hourlyData
      .filter((h) => h.totalMinutes >= 15 && h.hour >= 6)
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 4)
      .map((h) => h.hour)
      .sort((a, b) => a - b);
  }, [hourlyData, dangerZone]);

  const scoreBreakdown = useMemo(() => {
    const completedTasks = tasks.filter((t) => t.completed).length;
    return {
      consistency: Math.min(100, profile.streak * 5 + 20),
      focus: Math.min(100, focusSessions.reduce((a, s) => a + s.completedMinutes, 0) / 5),
      planning: Math.min(100, tasks.filter((t) => t.scheduledDate).length / Math.max(tasks.length, 1) * 100),
      recovery: 70,
      social: 40,
      growth: Math.min(100, completedTasks * 2),
    };
  }, [profile, tasks, focusSessions]);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.scheduledDate === todayStr);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const totalFocusMinutes = focusSessions.reduce((a, s) => a + s.completedMinutes, 0);
  const todayFocusMinutes = focusSessions.filter((s) => s.startedAt.startsWith(todayStr)).reduce((a, s) => a + s.completedMinutes, 0);
  const totalSessions = focusSessions.length;
  const completedSessions = focusSessions.filter((s) => s.completed).length;
  const hourlyProductivity = useMemo(() => computeHourlyProductivity(focusSessions), [focusSessions]);
  const categoryMinutes = useMemo(() => {
    const map: Record<string, number> = {};
    focusSessions.forEach((s) => { if (s.category) map[s.category] = (map[s.category] ?? 0) + s.completedMinutes; });
    return map;
  }, [focusSessions]);
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split("T")[0];
      const dayTasks = tasks.filter((t) => t.scheduledDate === dateStr);
      const done = dayTasks.filter((t) => t.completed).length;
      const focusMins = focusSessions.filter((s) => s.startedAt.startsWith(dateStr)).reduce((a, s) => a + s.completedMinutes, 0);
      return { date: d.toLocaleDateString("en", { weekday: "short" }), total: dayTasks.length, done, focusMins };
    });
  }, [tasks, focusSessions]);

  // ── Day picker labels ─────────────────────────────────────────────────────
  const DAY_CHIPS = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      if (i === 0) return "Today";
      if (i === 1) return "Yesterday";
      const d = new Date(); d.setDate(d.getDate() - i);
      return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
    });
  }, []);

  // ── Grant handler ─────────────────────────────────────────────────────────
  const handleGrantUsage = async () => {
    await UsageStats.requestPermission();
    setTimeout(() => {
      const granted = UsageStats.hasPermission();
      setUsagePermission(granted ? "granted" : "denied");
    }, 1500);
  };

  // ── Danger zone helpers ───────────────────────────────────────────────────
  const fmtDangerRanges = (hours: number[]): string => {
    if (hours.length === 0) return "";
    const sorted = [...hours].sort((a, b) => a - b);
    const ranges: string[] = [];
    let s = sorted[0], e = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === e + 1) { e = sorted[i]; }
      else { ranges.push(s === e ? fmtHour(s) : `${fmtHour(s)}–${fmtHour(e + 1)}`); s = sorted[i]; e = sorted[i]; }
    }
    ranges.push(s === e ? fmtHour(s) : `${fmtHour(s)}–${fmtHour(e + 1)}`);
    return ranges.join(", ");
  };

  // ── SCORE TAB ─────────────────────────────────────────────────────────────
  const renderScoreTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.scoreCenter}>
          <ProgressRing size={160} strokeWidth={14} progress={profile.raiScore / 1000} gradient trackColor={colors.border}>
            <View style={styles.scoreCenterContent}>
              <Text style={[styles.raiScoreValue, { color: colors.foreground }]}>{profile.raiScore}</Text>
              <Text style={[styles.raiScoreMax, { color: colors.mutedForeground }]}>/ 1000</Text>
              <Text style={[styles.raiScoreTier, { color: colors.primary }]}>{scoreTier.tier}</Text>
            </View>
          </ProgressRing>
          <Text style={[styles.tierTitle, { color: colors.foreground }]}>{scoreTier.title}</Text>
          <Text style={[styles.levelLabel, { color: colors.mutedForeground }]}>Level {profile.level} · {levelTitle}</Text>
          <View style={[styles.brainStateRow, { backgroundColor: brainState.color + "18", borderColor: brainState.color + "44" }]}>
            <Text style={styles.brainStateEmoji}>{brainState.emoji}</Text>
            <View>
              <Text style={[styles.brainStateLabel, { color: brainState.color }]}>{brainState.label}</Text>
              <Text style={[styles.brainStateDesc, { color: colors.mutedForeground }]}>{brainState.description}</Text>
            </View>
            <View style={[styles.brainScoreBadge, { backgroundColor: brainState.color + "22" }]}>
              <Text style={[styles.brainScoreVal, { color: brainState.color }]}>{brainState.score}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.xpBar, { backgroundColor: colors.border }]}>
          <View style={[styles.xpFill, { width: `${xpInfo.progress * 100}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>
          {xpInfo.current} / {xpInfo.needed} XP to Level {profile.level + 1}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Score Breakdown</Text>
        {Object.entries(scoreBreakdown).map(([key, val]) => (
          <View key={key} style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.foreground }]}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
            <View style={styles.breakdownBar}><MiniBar value={val} max={100} color={colors.primary} /></View>
            <Text style={[styles.breakdownValue, { color: colors.mutedForeground }]}>{Math.round(val)}/100</Text>
          </View>
        ))}
      </View>

      <View style={styles.statCards}>
        <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="flame" size={22} color="#F97316" />
          <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{profile.streak}</Text>
          <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Day Streak</Text>
        </View>
        <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="time" size={22} color={colors.primary} />
          <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{Math.round(totalFocusMinutes / 60)}h</Text>
          <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Total Focus</Text>
        </View>
        <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="checkmark-done" size={22} color={colors.success} />
          <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{tasks.filter((t) => t.completed).length}</Text>
          <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Tasks Done</Text>
        </View>
      </View>
    </View>
  );

  // ── SCREEN TIME TAB ───────────────────────────────────────────────────────
  const renderScreenTimeTab = () => (
    <View style={styles.tabContent}>
      {/* Day picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPickerRow}>
        {DAY_CHIPS.map((label, i) => (
          <TouchableOpacity
            key={i}
            onPress={async () => { await Haptics.selectionAsync(); setSelectedDayOffset(i); }}
            style={[styles.dayChip, {
              backgroundColor: selectedDayOffset === i ? colors.primary : "#12121C",
              borderColor: selectedDayOffset === i ? colors.primary : "#1E1E2E",
            }]}
          >
            <Text style={[styles.dayChipText, { color: selectedDayOffset === i ? "#FFF" : "#6B7280" }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Permission gate */}
      {usagePermission === "unavailable" && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Screen Time</Text>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            Screen time tracking is only available on Android devices.
          </Text>
        </View>
      )}

      {usagePermission === "denied" && (
        <View style={[styles.card, { backgroundColor: "#0F0A1A", borderColor: "#6366F133" }]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="phone-portrait" size={16} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Enable Screen Time</Text>
          </View>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            Grant Usage Access to see which apps are eating your time, track your phone unlocks, and get personalised danger zone alerts.
          </Text>
          <TouchableOpacity
            onPress={async () => { await Haptics.selectionAsync(); handleGrantUsage(); }}
            style={[styles.grantBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="lock-open" size={14} color="#FFF" />
            <Text style={styles.grantBtnText}>Open Usage Access Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {usagePermission === "granted" && (
        <>
          {/* Stats row */}
          {loadingUsage ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.helperText, { color: colors.mutedForeground }]}>Loading screen time…</Text>
            </View>
          ) : (
            <>
              <View style={styles.statCards}>
                <View style={[styles.miniStatCard, { backgroundColor: "#0F0F1A", borderColor: "#1E1E2E" }]}>
                  <Ionicons name="phone-portrait" size={20} color="#6366F1" />
                  <Text style={[styles.miniStatValue, { color: "#FFF", fontSize: 18 }]}>{fmtTime(totalScreenMins)}</Text>
                  <Text style={[styles.miniStatLabel, { color: "#6B7280" }]}>Screen Time</Text>
                </View>
                <View style={[styles.miniStatCard, { backgroundColor: "#0F0F1A", borderColor: "#1E1E2E" }]}>
                  <Ionicons name="lock-open" size={20} color="#F97316" />
                  <Text style={[styles.miniStatValue, { color: "#FFF", fontSize: 18 }]}>{unlockCount}</Text>
                  <Text style={[styles.miniStatLabel, { color: "#6B7280" }]}>Unlocks</Text>
                </View>
                <View style={[styles.miniStatCard, { backgroundColor: "#0F0F1A", borderColor: "#1E1E2E" }]}>
                  <Ionicons name="apps" size={20} color="#10B981" />
                  <Text style={[styles.miniStatValue, { color: "#FFF", fontSize: 18 }]}>{totalOpenCount}</Text>
                  <Text style={[styles.miniStatLabel, { color: "#6B7280" }]}>App Opens</Text>
                </View>
              </View>

              {/* 24hr hourly timeline */}
              {hourlyData.length > 0 && (
                <View style={[styles.card, { backgroundColor: "#0F0F1A", borderColor: "#1E1E2E" }]}>
                  <View style={styles.cardTitleRow}>
                    <Ionicons name="time" size={14} color="#6366F1" />
                    <Text style={[styles.cardTitle, { color: "#FFF" }]}>24h Timeline</Text>
                    {computedDangerHours.length > 0 && (
                      <View style={styles.dangerBadge}>
                        <Ionicons name="flash" size={10} color="#EF4444" />
                        <Text style={styles.dangerBadgeText}>
                          Peak: {fmtDangerRanges(computedDangerHours)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.hourlyBars}>
                    {hourlyData.map((h) => {
                      const isDanger = computedDangerHours.includes(h.hour);
                      const isSleep = h.hour < 5 || h.hour >= 1 && h.hour < 5;
                      const barH = maxHourMins > 0 ? Math.max(2, (h.totalMinutes / maxHourMins) * 52) : 2;
                      const barColor = isDanger ? "#EF4444" : CATEGORY_COLORS.other;
                      const opacity = h.totalMinutes === 0 ? 0.12 : isDanger ? 1 : 0.65;
                      return (
                        <View key={h.hour} style={styles.hourBarWrap}>
                          <View style={[styles.hourBar, {
                            height: barH,
                            backgroundColor: barColor,
                            opacity,
                          }]} />
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.hourLabelsRow}>
                    {["12am", "6am", "12pm", "6pm", "11pm"].map((l) => (
                      <Text key={l} style={styles.hourLabel}>{l}</Text>
                    ))}
                  </View>
                  {computedDangerHours.length > 0 && (
                    <View style={styles.dangerInfoRow}>
                      <View style={styles.dangerDot} />
                      <Text style={styles.dangerInfoText}>Red bars = high phone usage (your personal danger zone)</Text>
                    </View>
                  )}
                </View>
              )}

              {/* App list */}
              {dayUsage.length === 0 ? (
                <View style={[styles.card, { backgroundColor: "#0F0F1A", borderColor: "#1E1E2E" }]}>
                  <Text style={[styles.helperText, { color: "#6B7280", textAlign: "center" }]}>
                    {selectedDayOffset === 0 ? "No significant app usage yet today." : "No data for this day."}
                  </Text>
                </View>
              ) : (
                <View style={[styles.card, { backgroundColor: "#0F0F1A", borderColor: "#1E1E2E" }]}>
                  <Text style={[styles.cardTitle, { color: "#FFF" }]}>
                    {selectedDayOffset === 0 ? "Today's Apps" : DAY_CHIPS[selectedDayOffset]}
                  </Text>
                  {dayUsage.map((app, i) => {
                    const maxMins = dayUsage[0]?.totalMinutes ?? 1;
                    const isBad = app.category === "social" || app.category === "entertainment" || app.category === "games";
                    const barColor = CATEGORY_COLORS[app.category] ?? "#6366F1";
                    return (
                      <TouchableOpacity
                        key={app.packageName}
                        onPress={async () => {
                          await Haptics.selectionAsync();
                          setSelectedApp(app);
                          setShowAppDetail(true);
                        }}
                        style={styles.appRow}
                        activeOpacity={0.7}
                      >
                        <AppIcon app={app} size={38} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <View style={styles.appNameRow}>
                            <Text style={styles.appNameText} numberOfLines={1}>{app.appName}</Text>
                            {isBad && <Ionicons name="warning" size={11} color="#EF4444" />}
                          </View>
                          <MiniBar value={app.totalMinutes} max={maxMins} color={barColor} />
                          <Text style={styles.appMetaText}>
                            {CATEGORY_LABELS[app.category] ?? "Other"} · {app.openCount} opens
                          </Text>
                        </View>
                        <Text style={[styles.appTimeText, { color: isBad ? "#EF4444" : "#9CA3AF" }]}>
                          {fmtTime(app.totalMinutes)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Danger zone card from real usage */}
              {computedDangerHours.length > 0 && (
                <View style={[styles.card, { backgroundColor: "#1A0A0A", borderColor: "#EF444430" }]}>
                  <View style={styles.cardTitleRow}>
                    <Ionicons name="warning" size={14} color="#EF4444" />
                    <Text style={[styles.cardTitle, { color: "#FFF" }]}>Danger Zone</Text>
                    {hourlyData.length > 0 && (
                      <View style={[styles.learnBadge, { backgroundColor: "#10B98120" }]}>
                        <Text style={[styles.learnBadgeText, { color: "#10B981" }]}>From real usage</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.dangerPillRow}>
                    {(() => {
                      const sorted = [...computedDangerHours].sort((a, b) => a - b);
                      const ranges: [number, number][] = [];
                      let s = sorted[0], e = sorted[0];
                      for (let i = 1; i < sorted.length; i++) {
                        if (sorted[i] === e + 1) { e = sorted[i]; }
                        else { ranges.push([s, e]); s = sorted[i]; e = sorted[i]; }
                      }
                      ranges.push([s, e]);
                      return ranges.map(([rs, re]) => (
                        <View key={rs} style={[styles.dangerPill, { backgroundColor: "#EF444420", borderColor: "#EF444440" }]}>
                          <Ionicons name="flash" size={10} color="#EF4444" />
                          <Text style={[styles.dangerPillText, { color: "#EF4444" }]}>
                            {rs === re ? fmtHour(rs) : `${fmtHour(rs)}–${fmtHour(re + 1)}`}
                          </Text>
                        </View>
                      ));
                    })()}
                  </View>
                  <Text style={[styles.helperText, { color: "#6B7280" }]}>
                    These are the hours where you use your phone the most.
                    {profile.dangerZoneAlertsEnabled
                      ? " RAI will alert you 15 min before each zone."
                      : " Enable danger zone alerts in Settings to get warned."}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Focus session summary */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="timer" size={14} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Focus Sessions</Text>
            </View>
            <View style={styles.statCards}>
              <View style={[styles.miniStatCard, { backgroundColor: "#0F0F1A", borderColor: "#1E1E2E" }]}>
                <Ionicons name="play-circle" size={20} color={colors.primary} />
                <Text style={[styles.miniStatValue, { color: "#FFF", fontSize: 18 }]}>{totalSessions}</Text>
                <Text style={[styles.miniStatLabel, { color: "#6B7280" }]}>Sessions</Text>
              </View>
              <View style={[styles.miniStatCard, { backgroundColor: "#0F0F1A", borderColor: "#1E1E2E" }]}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={[styles.miniStatValue, { color: "#FFF", fontSize: 18 }]}>{completedSessions}</Text>
                <Text style={[styles.miniStatLabel, { color: "#6B7280" }]}>Completed</Text>
              </View>
              <View style={[styles.miniStatCard, { backgroundColor: "#0F0F1A", borderColor: "#1E1E2E" }]}>
                <Ionicons name="timer" size={20} color="#8B5CF6" />
                <Text style={[styles.miniStatValue, { color: "#FFF", fontSize: 18 }]}>{fmtTime(todayFocusMinutes)}</Text>
                <Text style={[styles.miniStatLabel, { color: "#6B7280" }]}>Today</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );

  // ── PRODUCTIVITY TAB ──────────────────────────────────────────────────────
  const renderProductivityTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>7-Day Task Completion</Text>
        <View style={styles.barChart}>
          {last7Days.map((day) => (
            <View key={day.date} style={styles.barColumn}>
              <View style={styles.barContainer}>
                <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.barFill, {
                    height: `${(day.total > 0 ? (day.done / day.total) : 0) * 100}%`,
                    backgroundColor: colors.primary,
                  }]} />
                </View>
              </View>
              <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{day.date.slice(0, 2)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>7-Day Focus Minutes</Text>
        <View style={styles.barChart}>
          {last7Days.map((day) => {
            const maxFocus = Math.max(...last7Days.map((d) => d.focusMins), 1);
            return (
              <View key={day.date} style={styles.barColumn}>
                <View style={styles.barContainer}>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.barFill, { height: `${(day.focusMins / maxFocus) * 100}%`, backgroundColor: "#8B5CF6" }]} />
                  </View>
                </View>
                <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{day.date.slice(0, 2)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Focus Category Breakdown</Text>
        {Object.entries(categoryMinutes).length === 0 ? (
          <Text style={[styles.helperText, { color: colors.mutedForeground, textAlign: "center", paddingVertical: 8 }]}>
            Complete focus sessions to see breakdown
          </Text>
        ) : (
          Object.entries(categoryMinutes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, mins]) => (
            <View key={cat} style={styles.catBreakdownRow}>
              <View style={[styles.catDot, { backgroundColor: getCategoryColor(cat, true) }]} />
              <Text style={[styles.catName, { color: colors.foreground }]}>{cat}</Text>
              <View style={styles.catBarWrap}>
                <MiniBar value={mins} max={Math.max(...Object.values(categoryMinutes))} color={getCategoryColor(cat, true)} />
              </View>
              <Text style={[styles.catMins, { color: colors.mutedForeground }]}>{mins}m</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.statCards}>
        <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{completedToday}/{todayTasks.length}</Text>
          <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Today's Rate</Text>
        </View>
        <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="trending-up" size={22} color={colors.warning} />
          <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{todayFocusScore}</Text>
          <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Focus Score</Text>
        </View>
        <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="repeat" size={22} color={colors.accent} />
          <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{focusSessions.length}</Text>
          <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Sessions</Text>
        </View>
      </View>
    </View>
  );

  // ── APP DETAIL MODAL ──────────────────────────────────────────────────────
  const renderAppDetail = () => {
    if (!selectedApp) return null;
    const isBad = selectedApp.category === "social" || selectedApp.category === "entertainment" || selectedApp.category === "games";
    const catColor = CATEGORY_COLORS[selectedApp.category] ?? "#6366F1";
    return (
      <Modal visible={showAppDetail} transparent animationType="slide" onRequestClose={() => setShowAppDetail(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAppDetail(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.detailSheet}
            onPress={() => {}}
          >
            {/* Pull handle */}
            <View style={styles.sheetHandle} />

            {/* App identity */}
            <View style={styles.detailHeader}>
              <AppIcon app={selectedApp} size={56} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.detailName}>{selectedApp.appName}</Text>
                <View style={styles.catBadge}>
                  <View style={[styles.catBadgeDot, { backgroundColor: catColor }]} />
                  <Text style={[styles.catBadgeText, { color: catColor }]}>{CATEGORY_LABELS[selectedApp.category] ?? "Other"}</Text>
                  {isBad && <Ionicons name="warning" size={11} color="#EF4444" />}
                </View>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.detailStats}>
              <View style={[styles.detailStat, { borderColor: "#1E1E2E" }]}>
                <Text style={styles.detailStatValue}>{fmtTime(selectedApp.totalMinutes)}</Text>
                <Text style={styles.detailStatLabel}>Screen Time</Text>
              </View>
              <View style={[styles.detailStat, { borderColor: "#1E1E2E" }]}>
                <Text style={styles.detailStatValue}>{selectedApp.openCount}</Text>
                <Text style={styles.detailStatLabel}>Opens</Text>
              </View>
              <View style={[styles.detailStat, { borderColor: "#1E1E2E" }]}>
                <Text style={styles.detailStatValue}>
                  {selectedApp.openCount > 0 ? fmtTime(Math.round(selectedApp.totalMinutes / selectedApp.openCount)) : "—"}
                </Text>
                <Text style={styles.detailStatLabel}>Avg / Session</Text>
              </View>
            </View>

            {isBad && (
              <View style={[styles.warnBox, { backgroundColor: "#EF444411", borderColor: "#EF444433" }]}>
                <Ionicons name="warning" size={15} color="#EF4444" />
                <Text style={styles.warnText}>
                  This is a distraction app. You've spent {fmtTime(selectedApp.totalMinutes)} on it.
                  Use the Focus timer and App Blocker to reclaim this time.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setShowAppDetail(false)}
              style={[styles.dismissBtn, { backgroundColor: "#1A1A2E" }]}
            >
              <Text style={styles.dismissText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        paddingTop: topPadding + 8,
        backgroundColor: colors.background,
        borderBottomColor: colors.border,
      }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Analytics</Text>
        <View style={styles.tabRow}>
          {(["score", "screentime", "productivity"] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={async () => { await Haptics.selectionAsync(); setActiveTab(tab); }}
              style={[styles.tabBtn, {
                backgroundColor: activeTab === tab ? colors.primary : colors.secondary,
                borderColor: activeTab === tab ? colors.primary : colors.border,
              }]}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? "#FFF" : colors.mutedForeground }]}>
                {tab === "score" ? "RAI Score" : tab === "screentime" ? "Screen Time" : "Productivity"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {activeTab === "score" && renderScoreTab()}
        {activeTab === "screentime" && renderScreenTimeTab()}
        {activeTab === "productivity" && renderProductivityTab()}
      </ScrollView>

      {renderAppDetail()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", gap: 8 },
  tabBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: "center" },
  tabText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tabContent: { padding: 16, gap: 14 },

  // Day picker
  dayPickerRow: { paddingHorizontal: 16, paddingVertical: 4, gap: 8 },
  dayChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  dayChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Stats
  statCards: { flexDirection: "row", gap: 10 },
  miniStatCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  miniStatValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  miniStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },

  // Cards
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },

  // Loading
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", paddingVertical: 12 },
  helperText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },

  // Grant button
  grantBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignSelf: "flex-start" },
  grantBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" },

  // Hourly timeline
  hourlyBars: { flexDirection: "row", height: 56, alignItems: "flex-end", gap: 1 },
  hourBarWrap: { flex: 1, justifyContent: "flex-end", height: 56 },
  hourBar: { width: "100%", borderRadius: 2 },
  hourLabelsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  hourLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#4B5563" },
  dangerBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: "auto", backgroundColor: "#EF444420", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  dangerBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#EF4444" },
  dangerInfoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4 },
  dangerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  dangerInfoText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280", flex: 1 },

  // App list
  appRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  appNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  appNameText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF", flex: 1 },
  appMetaText: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#4B5563" },
  appTimeText: { fontSize: 13, fontFamily: "Inter_700Bold", minWidth: 42, textAlign: "right" },

  // Danger zone
  dangerPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dangerPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  dangerPillText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  learnBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginLeft: "auto" },
  learnBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  // Score tab
  scoreCenter: { alignItems: "center", gap: 8 },
  scoreCenterContent: { alignItems: "center" },
  raiScoreValue: { fontSize: 40, fontFamily: "Inter_700Bold" },
  raiScoreMax: { fontSize: 14, fontFamily: "Inter_400Regular" },
  raiScoreTier: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tierTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  levelLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  xpBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 3 },
  xpLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownLabel: { width: 90, fontSize: 13, fontFamily: "Inter_500Medium" },
  breakdownBar: { flex: 1 },
  breakdownValue: { width: 50, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  brainStateRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, alignSelf: "stretch" },
  brainStateEmoji: { fontSize: 24 },
  brainStateLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  brainStateDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  brainScoreBadge: { marginLeft: "auto", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  brainScoreVal: { fontSize: 18, fontFamily: "Inter_700Bold" },

  // Productivity tab
  barChart: { flexDirection: "row", justifyContent: "space-between", height: 120, alignItems: "flex-end" },
  barColumn: { alignItems: "center", gap: 6, flex: 1 },
  barContainer: { flex: 1, width: "100%", alignItems: "center" },
  barTrack: { width: 24, height: 100, borderRadius: 6, overflow: "hidden", justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 6 },
  barLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  catBreakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { width: 80, fontSize: 13, fontFamily: "Inter_500Medium" },
  catBarWrap: { flex: 1 },
  catMins: { width: 36, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },

  // App detail modal
  modalOverlay: { flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" },
  detailSheet: { backgroundColor: "#0D0D1A", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 20 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#1E1E2E", alignSelf: "center", marginBottom: 4 },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 16 },
  detailName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFF" },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  catBadgeDot: { width: 8, height: 8, borderRadius: 4 },
  catBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  detailStats: { flexDirection: "row", gap: 10 },
  detailStat: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: "#1E1E2E", padding: 12, alignItems: "center", gap: 4, backgroundColor: "#0F0F1A" },
  detailStatValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFF" },
  detailStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#6B7280", textAlign: "center" },
  warnBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  warnText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#EF4444", flex: 1, lineHeight: 18 },
  dismissBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  dismissText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#9CA3AF" },
});
