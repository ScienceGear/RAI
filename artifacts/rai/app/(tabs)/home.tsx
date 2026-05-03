import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  useColorScheme, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { TaskCard } from "@/components/TaskCard";
import { TaskSheet } from "@/components/TaskSheet";
import { MoodCheckIn } from "@/components/MoodCheckIn";
import { ProgressRing } from "@/components/ProgressRing";
import { Task } from "@/types";
import { generateAIInsight } from "@/lib/ai";
import { getRaiScoreTier } from "@/constants/categories";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const { profile, tasks, focusSessions, dangerZone, todayFocusScore } = useApp();

  const [showTaskSheet, setShowTaskSheet] = useState(false);
  const [showMood, setShowMood] = useState(false);
  const [aiInsight, setAIInsight] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.scheduledDate === today).sort((a, b) => {
    if (!a.scheduledTime) return 1;
    if (!b.scheduledTime) return -1;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const unscheduled = tasks.filter((t) => !t.scheduledDate && !t.completed).slice(0, 3);
  const currentHour = new Date().getHours();
  const isInDangerZone = dangerZone.dangerHours.includes(currentHour);

  const { completeTask, deleteTask, scheduleTask } = useApp();
  const scoreTier = getRaiScoreTier(profile.raiScore);

  useEffect(() => { loadInsight(); }, []);

  const loadInsight = async () => {
    const insight = await generateAIInsight({
      todayTasks,
      streak: profile.streak,
      focusScore: todayFocusScore,
      dangerHours: dangerZone.dangerHours,
    });
    setAIInsight(
      insight ||
      `${profile.streak > 0 ? `${profile.streak}-day streak!` : "Welcome back."} ${todayTasks.length > 0 ? `${todayTasks.length} tasks lined up today.` : "Add a task to get started."}`
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInsight();
    setRefreshing(false);
  }, []);

  const topPadding = Platform.OS === "web" ? 56 : insets.top;
  const tabBarHeight = Platform.OS === "web" ? 84 : 60 + insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 80 }}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: topPadding + 16, backgroundColor: colors.background }]}>
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{getGreeting()}</Text>
              <Text style={[styles.userName, { color: colors.foreground }]}>{profile.firstName || "Athlete"}</Text>
            </View>
            <View style={styles.topActions}>
              <TouchableOpacity
                onPress={() => setShowMood(true)}
                style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Ionicons name="happy-outline" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/profile")}
              >
                <Text style={styles.avatarText}>{(profile.firstName?.[0] ?? "U").toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Score Card ── */}
        <View style={styles.cardSection}>
          <LinearGradient
            colors={["#4F46E5", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scoreCard}
          >
            <View style={styles.scoreLeft}>
              <Text style={styles.scoreLabelText}>RAI SCORE</Text>
              <Text style={styles.scoreBigNumber}>{todayFocusScore}</Text>
              <View style={[styles.tierBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <Text style={styles.tierText}>{scoreTier.title}</Text>
              </View>
            </View>
            <ProgressRing
              size={96}
              strokeWidth={9}
              progress={todayFocusScore / 100}
              gradient
              trackColor="rgba(255,255,255,0.15)"
            >
              <Text style={styles.ringPercent}>{todayFocusScore}%</Text>
            </ProgressRing>
          </LinearGradient>

          {isInDangerZone && (
            <View style={[styles.dangerBanner, { backgroundColor: colors.dangerZoneBackground, borderColor: colors.dangerZone + "44" }]}>
              <Ionicons name="warning" size={14} color={colors.dangerZone} />
              <Text style={[styles.dangerText, { color: colors.dangerZone }]}>
                Danger zone · {dangerZone.dangerHours[0]}:00–{(dangerZone.dangerHours[dangerZone.dangerHours.length - 1] ?? 15) + 1}:00
              </Text>
            </View>
          )}
        </View>

        {/* ── Stats ── */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={18} color="#F97316" />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{profile.streak}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>streak</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{profile.xp}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>XP</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{completedToday}/{todayTasks.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>done</Text>
          </View>
        </View>

        {/* ── AI Insight ── */}
        {aiInsight ? (
          <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.primary + "30" }]}>
            <View style={styles.insightHeader}>
              <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={styles.raiPill}>
                <Text style={styles.raiPillText}>RAI</Text>
              </LinearGradient>
              <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>AI Insight</Text>
            </View>
            <Text style={[styles.insightText, { color: colors.foreground }]}>{aiInsight}</Text>
          </View>
        ) : (
          <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.insightSkeleton, { backgroundColor: colors.border }]} />
            <View style={[styles.insightSkeletonShort, { backgroundColor: colors.border }]} />
          </View>
        )}

        {/* ── Today's Schedule ── */}
        <View style={styles.body}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Schedule</Text>
            <TouchableOpacity
              onPress={() => { setEditingTask(undefined); setShowTaskSheet(true); }}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          {todayTasks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="calendar" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No tasks today</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Let RAI auto-schedule your first task</Text>
              <TouchableOpacity
                onPress={() => setShowTaskSheet(true)}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="flash" size={15} color="#FFF" />
                <Text style={styles.emptyBtnText}>Add a task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={() => completeTask(task.id)}
                onEdit={() => { setEditingTask(task); setShowTaskSheet(true); }}
                onDelete={() => deleteTask(task.id)}
              />
            ))
          )}

          {unscheduled.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 4 }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Unscheduled</Text>
                <TouchableOpacity
                  onPress={() => unscheduled.forEach((t) => scheduleTask(t.id))}
                  style={[styles.scheduleAllBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Ionicons name="flash" size={13} color={colors.primary} />
                  <Text style={[styles.scheduleAllText, { color: colors.primary }]}>Auto-schedule</Text>
                </TouchableOpacity>
              </View>
              {unscheduled.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={() => completeTask(task.id)}
                  onEdit={() => { setEditingTask(task); setShowTaskSheet(true); }}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── FAB ── */}
      <View style={[styles.fab, { paddingBottom: insets.bottom + 72, ...(Platform.OS === "web" ? { paddingBottom: 96 } : {}) }]}>
        <TouchableOpacity
          onPress={() => router.push("/focus")}
          style={[styles.focusBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="play" size={18} color="#FFF" />
          <Text style={styles.focusBtnText}>Start Focus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setEditingTask(undefined); setShowTaskSheet(true); }}
          style={[styles.addFab, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <TaskSheet
        visible={showTaskSheet}
        task={editingTask}
        onClose={() => { setShowTaskSheet(false); setEditingTask(undefined); }}
      />
      <MoodCheckIn visible={showMood} onClose={() => setShowMood(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { paddingHorizontal: 20, paddingBottom: 20 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold" },
  topActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },

  cardSection: { paddingHorizontal: 20, gap: 10, marginBottom: 4 },
  scoreCard: { borderRadius: 20, padding: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scoreLeft: { gap: 6 },
  scoreLabelText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.65)", letterSpacing: 1.2 },
  scoreBigNumber: { fontSize: 52, fontFamily: "Inter_700Bold", color: "#FFF", lineHeight: 58 },
  tierBadge: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tierText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  ringPercent: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFF" },

  dangerBanner: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  dangerText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginHorizontal: 20, marginVertical: 16, borderRadius: 16, borderWidth: 1, paddingVertical: 16 },
  statItem: { alignItems: "center", gap: 3, flex: 1 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 32 },

  insightCard: { marginHorizontal: 20, marginBottom: 4, borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  insightHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  raiPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  raiPillText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: 0.5 },
  insightLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  insightText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  insightSkeleton: { height: 12, borderRadius: 6, width: "90%" },
  insightSkeletonShort: { height: 12, borderRadius: 6, width: "65%", marginTop: 8 },

  body: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  addBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },

  emptyState: { borderRadius: 18, borderWidth: 1, padding: 32, alignItems: "center", gap: 8 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12, marginTop: 8 },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },

  scheduleAllBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  scheduleAllText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  fab: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20 },
  focusBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 16 },
  focusBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  addFab: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
