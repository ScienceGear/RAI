import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { ProgressRing } from "@/components/ProgressRing";
import { getRaiScoreTier, getCategoryColor } from "@/constants/categories";
import { xpToNextLevel, getLevelTitle } from "@/lib/xp";
import { formatDangerHours, computeHourlyProductivity } from "@/lib/brainstate";
import { UsageStats, AppUsage } from "@/modules/usage-stats";

type Tab = "score" | "screentime" | "productivity";

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ height: 6, flex: 1, backgroundColor: "#1E1E2E", borderRadius: 3, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

function HeatmapCell({ value, max }: { value: number; max: number }) {
  const intensity = max > 0 ? value / max : 0;
  const alpha = Math.round(intensity * 200);
  const hex = alpha.toString(16).padStart(2, "0");
  return <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: `#6366F1${hex}`, margin: 1 }} />;
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, tasks, focusSessions, dangerZone, brainState, todayFocusScore, updateProfile } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>("score");
  const [usagePermission, setUsagePermission] = useState<"granted" | "denied" | "unavailable">(
    UsageStats.isAvailable() ? (UsageStats.hasPermission() ? "granted" : "denied") : "unavailable"
  );
  const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // Re-check usage permission whenever the app comes back to the foreground.
  // This fires after the user returns from Usage Access or Accessibility Settings.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        if (UsageStats.isAvailable()) {
          const granted = UsageStats.hasPermission();
          const next = granted ? "granted" : "denied";
          setUsagePermission(next);
          // Sync to profile so the permission status persists
          if (granted && !profile.usageStatsGranted) {
            updateProfile({ usageStatsGranted: true });
          }
        }
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [profile.usageStatsGranted]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const scoreTier = getRaiScoreTier(profile.raiScore);
  const xpInfo = xpToNextLevel(profile.xp);
  const levelTitle = getLevelTitle(profile.level);

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

  const categoryMinutes = useMemo(() => {
    const map: Record<string, number> = {};
    focusSessions.forEach((s) => {
      if (s.category) map[s.category] = (map[s.category] ?? 0) + s.completedMinutes;
    });
    return map;
  }, [focusSessions]);

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split("T")[0];
      const dayTasks = tasks.filter((t) => t.scheduledDate === dateStr);
      const done = dayTasks.filter((t) => t.completed).length;
      const focusMins = focusSessions.filter((s) => s.startedAt.startsWith(dateStr)).reduce((a, s) => a + s.completedMinutes, 0);
      return { date: d.toLocaleDateString("en", { weekday: "short" }), total: dayTasks.length, done, focusMins };
    });
  }, [tasks, focusSessions]);

  const maxDone = Math.max(...last7Days.map((d) => d.total), 1);

  // Hourly productivity from focus session history (0–100 per hour)
  const hourlyProductivity = useMemo(() => computeHourlyProductivity(focusSessions), [focusSessions]);

  // Load real device screen time when permission is available
  useEffect(() => {
    if (usagePermission !== "granted") return;
    setLoadingUsage(true);
    UsageStats.getTodayAppUsage()
      .then((data) => setAppUsage(data))
      .finally(() => setLoadingUsage(false));
  }, [usagePermission]);

  const handleGrantUsage = async () => {
    await UsageStats.requestPermission();
    // Check again after returning from settings
    setTimeout(() => {
      const granted = UsageStats.hasPermission();
      setUsagePermission(granted ? "granted" : "denied");
    }, 1000);
  };

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

      <View style={[styles.statCards]}>
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

  const dangerLabel = formatDangerHours(dangerZone.dangerHours);

  const renderScreenTimeTab = () => (
    <View style={styles.tabContent}>
      {/* Today's focus summary */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="time" size={16} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Today's Focus Time</Text>
        </View>
        <View style={styles.screenTimeRow}>
          <View style={styles.screenTimeStat}>
            <Text style={[styles.bigNumber, { color: colors.primary }]}>
              {Math.floor(todayFocusMinutes / 60)}h {todayFocusMinutes % 60}m
            </Text>
            <Text style={[styles.screenTimeLabel, { color: colors.mutedForeground }]}>productive today</Text>
          </View>
          <View style={[styles.riskBadge, { backgroundColor: todayFocusScore >= 60 ? "#10B98122" : "#F9731622", borderColor: todayFocusScore >= 60 ? "#10B98144" : "#F9731644" }]}>
            <Text style={[styles.riskValue, { color: todayFocusScore >= 60 ? colors.success : "#F97316" }]}>{todayFocusScore}</Text>
            <Text style={[styles.riskLabel, { color: todayFocusScore >= 60 ? colors.success : "#F97316" }]}>Score</Text>
          </View>
        </View>
      </View>

      {/* Focus session stats */}
      <View style={styles.statCards}>
        <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="play-circle" size={22} color={colors.primary} />
          <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{totalSessions}</Text>
          <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Sessions</Text>
        </View>
        <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{completedSessions}</Text>
          <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Completed</Text>
        </View>
        <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="trophy" size={22} color="#F59E0B" />
          <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{profile.longestStreak}</Text>
          <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Best Streak</Text>
        </View>
      </View>

      {/* Danger Zone — redesigned with proper time ranges */}
      <View style={[styles.card, { backgroundColor: "#1A0A0A", borderColor: "#EF444430" }]}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="warning" size={16} color="#EF4444" />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Danger Zone</Text>
          {dangerZone.isBootstrapEstimate && (
            <View style={[styles.learnBadge, { backgroundColor: "#EF444420" }]}>
              <Text style={[styles.learnBadgeText, { color: "#EF4444" }]}>Learning</Text>
            </View>
          )}
        </View>

        {/* Time range pills */}
        <View style={styles.dangerPillRow}>
          {dangerZone.dangerHours.length === 0 ? (
            <Text style={[styles.dangerNote, { color: colors.mutedForeground }]}>No danger hours detected yet</Text>
          ) : (
            (() => {
              // Group consecutive hours into ranges
              const sorted = [...dangerZone.dangerHours].sort((a, b) => a - b);
              const ranges: [number, number][] = [];
              let s = sorted[0], e = sorted[0];
              for (let i = 1; i < sorted.length; i++) {
                if (sorted[i] === e + 1) { e = sorted[i]; }
                else { ranges.push([s, e]); s = sorted[i]; e = sorted[i]; }
              }
              ranges.push([s, e]);
              const fmtH = (h: number) => h === 0 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`;
              return ranges.map(([rs, re]) => (
                <View key={rs} style={[styles.dangerPill, { backgroundColor: "#EF444420", borderColor: "#EF444440" }]}>
                  <Ionicons name="flash" size={11} color="#EF4444" />
                  <Text style={[styles.dangerPillText, { color: "#EF4444" }]}>
                    {rs === re ? fmtH(rs) : `${fmtH(rs)}–${fmtH(re + 1)}`}
                  </Text>
                </View>
              ));
            })()
          )}
        </View>

        {/* 24-hour productivity heatmap */}
        <View>
          <Text style={[styles.heatmapTitle, { color: colors.mutedForeground }]}>Hourly focus intensity</Text>
          <View style={styles.timelineBar}>
            {hourlyProductivity.map((score, h) => {
              const isDanger = dangerZone.dangerHours.includes(h);
              const isSleep = h < 6 || h >= 23;
              const barColor = isDanger ? "#EF4444" : isSleep ? "#1E1E2E" : `#6366F1`;
              const opacity = isSleep ? 0.3 : Math.max(0.15, score / 100);
              return (
                <View key={h} style={[styles.timelineCell, { backgroundColor: barColor, opacity }]} />
              );
            })}
          </View>
          <View style={styles.timelineLabels}>
            {["12a", "6a", "12p", "6p", "11p"].map((l) => (
              <Text key={l} style={[styles.heatmapLabel, { color: colors.mutedForeground }]}>{l}</Text>
            ))}
          </View>
        </View>

        <Text style={[styles.dangerNote, { color: colors.mutedForeground }]}>
          {dangerZone.isBootstrapEstimate
            ? "Showing common distraction windows. RAI personalises this after 5+ focus sessions."
            : `Personalised from ${focusSessions.length} focus sessions. Red bars = your weak hours.`}
        </Text>
      </View>

      {/* Android Usage Stats — real app screen time */}
      {usagePermission === "denied" && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="phone-portrait" size={16} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Device Screen Time</Text>
          </View>
          <Text style={[styles.dangerNote, { color: colors.mutedForeground }]}>
            Grant Usage Access to see which apps are eating your time today.
          </Text>
          <TouchableOpacity
            onPress={async () => { await Haptics.selectionAsync(); handleGrantUsage(); }}
            style={[styles.grantBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="lock-open" size={15} color="#FFF" />
            <Text style={styles.grantBtnText}>Grant Usage Access</Text>
          </TouchableOpacity>
        </View>
      )}

      {usagePermission === "granted" && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="phone-portrait" size={16} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Today's App Usage</Text>
          </View>
          {loadingUsage ? (
            <Text style={[styles.dangerNote, { color: colors.mutedForeground }]}>Loading…</Text>
          ) : appUsage.length === 0 ? (
            <Text style={[styles.dangerNote, { color: colors.mutedForeground }]}>No significant app usage yet today.</Text>
          ) : (
            appUsage.slice(0, 6).map((app, i) => {
              const maxMins = appUsage[0]?.totalMinutes ?? 1;
              const isBad = app.category === "social" || app.category === "entertainment" || app.category === "games";
              return (
                <View key={app.packageName} style={styles.appRow}>
                  <View style={[styles.appRank, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.appRankText, { color: colors.mutedForeground }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[styles.appName, { color: colors.foreground, width: undefined, flex: 1 }]} numberOfLines={1}>{app.appName}</Text>
                      {isBad && <Ionicons name="warning" size={12} color="#EF4444" />}
                    </View>
                    <MiniBar value={app.totalMinutes} max={maxMins} color={isBad ? "#EF4444" : colors.primary} />
                  </View>
                  <Text style={[styles.appMins, { color: isBad ? "#EF4444" : colors.mutedForeground }]}>
                    {app.totalMinutes >= 60 ? `${Math.floor(app.totalMinutes / 60)}h ${app.totalMinutes % 60}m` : `${app.totalMinutes}m`}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Distraction patterns from task skips */}
      {dangerZone.topDistractionApps.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Distraction Patterns</Text>
          {dangerZone.topDistractionApps.slice(0, 4).map((pattern, i) => (
            <View key={pattern + i} style={styles.appRow}>
              <View style={[styles.appRank, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.appRankText, { color: colors.mutedForeground }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.appName, { color: colors.foreground, flex: 1 }]}>{pattern}</Text>
              <MiniBar value={4 - i} max={4} color="#EF4444" />
            </View>
          ))}
        </View>
      )}
    </View>
  );

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
                    <View style={[styles.barFill, {
                      height: `${(day.focusMins / maxFocus) * 100}%`,
                      backgroundColor: "#8B5CF6",
                    }]} />
                  </View>
                </View>
                <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{day.date.slice(0, 2)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Category Breakdown</Text>
        {Object.entries(categoryMinutes).length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Complete focus sessions to see breakdown</Text>
        ) : (
          Object.entries(categoryMinutes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([cat, mins]) => (
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
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
                {tab === "score" ? "RAI Score" : tab === "screentime" ? "Focus Time" : "Productivity"}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", gap: 8 },
  tabBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: "center" },
  tabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tabContent: { padding: 16, gap: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
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
  statCards: { flexDirection: "row", gap: 10 },
  miniStatCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  miniStatValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  miniStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  screenTimeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  screenTimeStat: { gap: 4 },
  bigNumber: { fontSize: 28, fontFamily: "Inter_700Bold" },
  screenTimeLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  riskBadge: { borderRadius: 12, borderWidth: 1, padding: 16, alignItems: "center", minWidth: 70 },
  riskValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  riskLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dangerNote: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
  heatmapGrid: { flexDirection: "row", flexWrap: "wrap" },
  heatmapLabels: { flexDirection: "row", justifyContent: "space-between" },
  heatmapLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  infoBox: { flexDirection: "row", gap: 12, borderRadius: 14, borderWidth: 1, padding: 16, alignItems: "flex-start" },
  infoTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  infoBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start", marginTop: 8 },
  infoBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  learnBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginLeft: "auto" },
  learnBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  dangerPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dangerPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  dangerPillText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  heatmapTitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 6 },
  timelineBar: { flexDirection: "row", height: 28, borderRadius: 6, overflow: "hidden", gap: 1 },
  timelineCell: { flex: 1, borderRadius: 2 },
  timelineLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  grantBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignSelf: "flex-start" },
  grantBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  appMins: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 40, textAlign: "right" },
  appRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  appRank: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  appRankText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  appName: { width: 100, fontSize: 13, fontFamily: "Inter_500Medium" },
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
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 12 },
  brainStateRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, alignSelf: "stretch" },
  brainStateEmoji: { fontSize: 24 },
  brainStateLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  brainStateDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  brainScoreBadge: { marginLeft: "auto", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  brainScoreVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
});
