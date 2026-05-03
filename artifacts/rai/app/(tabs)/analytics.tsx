import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { ProgressRing } from "@/components/ProgressRing";
import { getRaiScoreTier, getCategoryColor } from "@/constants/categories";
import { xpToNextLevel, getLevelTitle } from "@/lib/xp";

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
  const { profile, tasks, focusSessions, dangerZone, todayFocusScore } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>("score");

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

  const renderScreenTimeTab = () => (
    <View style={styles.tabContent}>
      {/* What RAI can track */}
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

      {/* Android device usage note */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="warning" size={16} color="#F97316" />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Danger Zone: {dangerZone.dangerHours.map((h) => `${h}:00`).join("–")}</Text>
        </View>
        <Text style={[styles.dangerNote, { color: colors.mutedForeground }]}>
          {dangerZone.isBootstrapEstimate ? "Based on typical patterns. RAI learns your personal zone over 7 days." : `Personalised from ${dangerZone.dataPointsCount} days of your data.`}
        </Text>
        <View style={styles.heatmapGrid}>
          {Array.from({ length: 24 }, (_, h) => (
            <HeatmapCell key={h} value={dangerZone.dangerHours.includes(h) ? 80 : 20} max={100} />
          ))}
        </View>
        <View style={styles.heatmapLabels}>
          {["12a", "6a", "12p", "6p"].map((l) => (
            <Text key={l} style={[styles.heatmapLabel, { color: colors.mutedForeground }]}>{l}</Text>
          ))}
        </View>
      </View>

      {/* Platform note */}
      <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.primary + "30" }]}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>About device screen time</Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            {Platform.OS === "android"
              ? "RAI can request Android Usage Stats access to read your app usage. This requires manual permission in Settings."
              : "iOS restricts screen time access to Apple's own apps. RAI tracks your in-app productivity data instead."}
          </Text>
          {Platform.OS === "android" && (
            <TouchableOpacity
              onPress={async () => { await Haptics.selectionAsync(); Linking.openSettings(); }}
              style={[styles.infoBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.infoBtnText}>Open Usage Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Distraction Patterns</Text>
        {dangerZone.topDistractionApps.slice(0, 4).map((app, i) => (
          <View key={app} style={styles.appRow}>
            <View style={[styles.appRank, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.appRankText, { color: colors.mutedForeground }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.appName, { color: colors.foreground }]}>{app}</Text>
            <MiniBar value={4 - i} max={4} color="#EF4444" />
          </View>
        ))}
        <Text style={[styles.dangerNote, { color: colors.mutedForeground }]}>Update this list in your profile settings.</Text>
      </View>
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
});
