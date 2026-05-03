import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  useColorScheme, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
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

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const { profile, tasks, focusSessions, dangerZone, todayFocusScore } = useApp();

  const [showTaskSheet, setShowTaskSheet] = useState(false);
  const [showMood, setShowMood] = useState(false);
  const [aiInsight, setAIInsight] = useState("");
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

  useEffect(() => {
    loadInsight();
  }, []);

  const loadInsight = async () => {
    const insight = await generateAIInsight({
      todayTasks,
      streak: profile.streak,
      focusScore: todayFocusScore,
      dangerHours: dangerZone.dangerHours,
    });
    if (insight) setAIInsight(insight);
    else setAIInsight(`You're ${profile.streak} days in. Keep the momentum — your best tasks are scheduled for your peak hours.`);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInsight();
    setRefreshing(false);
  }, []);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        <LinearGradient
          colors={isDark ? ["#0D0B1A", "#0A0A0F"] : ["#F0F1FF", "#F8F9FF"]}
          style={[styles.header, { paddingTop: topPadding + 12 }]}
        >
          <View style={styles.topBar}>
            <View style={styles.logoRow}>
              <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
                <Text style={styles.logoMarkText}>R</Text>
              </View>
              <Text style={[styles.logoText, { color: colors.foreground }]}>RAI</Text>
            </View>
            <View style={styles.topActions}>
              <TouchableOpacity
                onPress={() => setShowMood(true)}
                style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Ionicons name="happy-outline" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push("/profile")}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{profile.firstName[0]?.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroCard}>
            <LinearGradient
              colors={isDark ? ["#12121C", "#1A1A28"] : ["#FFFFFF", "#F5F3FF"]}
              style={[styles.heroInner, { borderColor: colors.border }]}
            >
              <View style={styles.heroLeft}>
                <Text style={[styles.focusLabel, { color: colors.mutedForeground }]}>FOCUS SCORE</Text>
                <Text style={[styles.focusScore, { color: colors.primary }]}>{todayFocusScore}</Text>
                <Text style={[styles.raiTier, { color: colors.accent }]}>{scoreTier.title}</Text>
              </View>
              <ProgressRing
                size={90}
                strokeWidth={8}
                progress={todayFocusScore / 100}
                gradient
                trackColor={isDark ? "#1E1E2E" : "#E2E8F0"}
              >
                <Text style={[styles.progressText, { color: colors.primary }]}>{todayFocusScore}%</Text>
              </ProgressRing>
            </LinearGradient>

            {isInDangerZone && (
              <View style={[styles.dangerBanner, { backgroundColor: colors.dangerZoneBackground, borderColor: colors.dangerZone + "44" }]}>
                <Ionicons name="warning" size={14} color={colors.dangerZone} />
                <Text style={[styles.dangerText, { color: colors.dangerZone }]}>
                  Danger zone active · {dangerZone.dangerHours[0]}:00–{(dangerZone.dangerHours[dangerZone.dangerHours.length - 1] ?? 15) + 1}:00
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="flame" size={16} color="#F97316" />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{profile.streak}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>day streak</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{profile.xp}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>XP</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{completedToday}/{todayTasks.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>done today</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {aiInsight.length > 0 && (
            <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.primary + "33" }]}>
              <View style={styles.insightHeader}>
                <View style={[styles.raiDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.insightLabel, { color: colors.primary }]}>RAI INSIGHT</Text>
              </View>
              <Text style={[styles.insightText, { color: colors.foreground }]}>{aiInsight}</Text>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Schedule</Text>
            <TouchableOpacity onPress={() => { setEditingTask(undefined); setShowTaskSheet(true); }}>
              <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={18} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          {todayTasks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No tasks scheduled today</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Add a task and let RAI schedule it for you</Text>
              <TouchableOpacity
                onPress={() => setShowTaskSheet(true)}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="flash" size={16} color="#FFF" />
                <Text style={styles.emptyBtnText}>Auto-schedule a task</Text>
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
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Unscheduled</Text>
                <TouchableOpacity onPress={() => unscheduled.forEach((t) => scheduleTask(t.id))}>
                  <View style={[styles.scheduleAllBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Ionicons name="flash" size={14} color={colors.primary} />
                    <Text style={[styles.scheduleAllText, { color: colors.primary }]}>Auto-schedule all</Text>
                  </View>
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

      <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 70, ...(Platform.OS === "web" ? { paddingBottom: 100 } : {}) }]}>
        <TouchableOpacity
          onPress={() => router.push("/focus")}
          style={[styles.startFocusBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="play" size={18} color="#FFF" />
          <Text style={styles.startFocusText}>Start Focus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setEditingTask(undefined); setShowTaskSheet(true); }}
          style={[styles.micBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
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
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  logoMarkText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },
  logoText: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  topActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFF" },
  heroCard: { gap: 8 },
  heroInner: { borderRadius: 16, borderWidth: 1, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroLeft: { gap: 4 },
  focusLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  focusScore: { fontSize: 40, fontFamily: "Inter_700Bold", lineHeight: 48 },
  raiTier: { fontSize: 13, fontFamily: "Inter_500Medium" },
  progressText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  dangerBanner: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  dangerText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingVertical: 4 },
  statItem: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 28 },
  body: { padding: 20, gap: 16 },
  insightCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  insightHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  raiDot: { width: 6, height: 6, borderRadius: 3 },
  insightLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  insightText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  addBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emptyState: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 6 },
  emptyBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  scheduleAllBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  scheduleAllText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  fabContainer: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 20 },
  startFocusBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14 },
  startFocusText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  micBtn: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
