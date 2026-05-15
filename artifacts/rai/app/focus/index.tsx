import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { ProgressRing } from "@/components/ProgressRing";
import { getCategoryColor } from "@/constants/categories";
import { MoodCheckInModal } from "@/components/MoodCheckInModal";
import { Task, TimerMode } from "@/types";
import { showFocusNotification, clearFocusNotification } from "@/lib/notifications";

const DURATIONS: Record<TimerMode, number> = {
  pomodoro: 25,
  deep: 50,
  ultra: 90,
};

const MODE_LABELS: Record<TimerMode, string> = {
  pomodoro: "Pomodoro",
  deep: "Deep Work",
  ultra: "Ultra Deep",
};

export default function FocusScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, addFocusSession, completeTask } = useApp();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();

  const today = new Date().toISOString().split("T")[0];
  const nextTask = taskId
    ? tasks.find((t) => t.id === taskId)
    : tasks.find((t) => t.scheduledDate === today && !t.completed && t.scheduledTime);

  const [selectedMode, setSelectedMode] = useState<TimerMode>("pomodoro");
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(nextTask);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(DURATIONS[selectedMode] * 60);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showMoodCheck, setShowMoodCheck] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = DURATIONS[selectedMode] * 60;
  const progress = (totalSeconds - timeRemaining) / totalSeconds;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  useEffect(() => {
    if (!isRunning) return;
    setTimeRemaining(DURATIONS[selectedMode] * 60);
  }, [selectedMode]);

  // Main timer tick
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handleComplete();
            return 0;
          }
          const elapsed = totalSeconds - prev + 1;
          if (elapsed % 60 === 0) setXpEarned((x) => x + Math.round(1.5));
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, isPaused, selectedMode]);

  // Live notification — update every 60 s while session is active
  useEffect(() => {
    if (isRunning && !isPaused && Platform.OS === "android") {
      // Show immediately
      showFocusNotification(timeStr, selectedTask?.title);
      // Update every 60 s
      notifIntervalRef.current = setInterval(() => {
        const remaining = timeRemaining;
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        const str = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        showFocusNotification(str, selectedTask?.title);
      }, 60_000);
    } else {
      if (notifIntervalRef.current) clearInterval(notifIntervalRef.current);
      if (Platform.OS === "android") clearFocusNotification();
    }
    return () => {
      if (notifIntervalRef.current) clearInterval(notifIntervalRef.current);
    };
  }, [isRunning, isPaused]);

  const handleStart = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRunning(true);
    setIsPaused(false);
    setSessionStart(new Date());
    setXpEarned(0);
    setIsComplete(false);
  };

  const handlePause = async () => {
    await Haptics.selectionAsync();
    setIsPaused((p) => !p);
  };

  const handleEnd = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (notifIntervalRef.current) clearInterval(notifIntervalRef.current);
    clearFocusNotification();

    const completedMinutes = sessionStart
      ? Math.round((new Date().getTime() - sessionStart.getTime()) / 60000)
      : DURATIONS[selectedMode] - Math.floor(timeRemaining / 60);

    await addFocusSession({
      taskId: selectedTask?.id,
      taskTitle: selectedTask?.title ?? "Focus Session",
      category: selectedTask?.categoryPrimary,
      mode: selectedMode,
      durationMinutes: DURATIONS[selectedMode],
      completedMinutes,
      completed: false,
      xpEarned: Math.round(completedMinutes * 1.5),
      startedAt: sessionStart?.toISOString() ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
    });

    setIsRunning(false);
    setTimeRemaining(DURATIONS[selectedMode] * 60);
    setSessionStart(null);
    setTimeout(() => setShowMoodCheck(true), 400);
  };

  const handleComplete = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (notifIntervalRef.current) clearInterval(notifIntervalRef.current);
    clearFocusNotification();

    const xp = Math.round(DURATIONS[selectedMode] * 1.5);
    setXpEarned(xp);
    setIsComplete(true);
    setIsRunning(false);

    await addFocusSession({
      taskId: selectedTask?.id,
      taskTitle: selectedTask?.title ?? "Focus Session",
      category: selectedTask?.categoryPrimary,
      mode: selectedMode,
      durationMinutes: DURATIONS[selectedMode],
      completedMinutes: DURATIONS[selectedMode],
      completed: true,
      xpEarned: xp,
      startedAt: sessionStart?.toISOString() ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
    });

    if (selectedTask) await completeTask(selectedTask.id);
    setTimeout(() => setShowMoodCheck(true), 600);
  }, [selectedMode, selectedTask, sessionStart]);

  const catColor = selectedTask ? getCategoryColor(selectedTask.categoryPrimary, true) : colors.primary;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const todayTasks = tasks.filter((t) => t.scheduledDate === today && !t.completed);

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A", "#130A28"]} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { clearFocusNotification(); router.back(); }}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Focus Timer</Text>
            {isRunning && !isPaused && (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {selectedTask ? (
            <View style={[styles.taskBanner, { backgroundColor: catColor + "22", borderColor: catColor + "44" }]}>
              <View style={[styles.taskDot, { backgroundColor: catColor }]} />
              <Text style={[styles.taskTitle, { color: "#FFF" }]} numberOfLines={1}>{selectedTask.title}</Text>
            </View>
          ) : (
            <Text style={styles.noTaskLabel}>No task — free focus</Text>
          )}

          <View style={styles.modeRow}>
            {(Object.keys(DURATIONS) as TimerMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => { if (!isRunning) { setSelectedMode(mode); setTimeRemaining(DURATIONS[mode] * 60); } }}
                style={[styles.modeBtn, {
                  backgroundColor: selectedMode === mode ? catColor : "#12121C",
                  borderColor: selectedMode === mode ? catColor : "#1E1E2E",
                }]}
              >
                <Text style={[styles.modeBtnText, { color: selectedMode === mode ? "#FFF" : "#6B7280" }]}>
                  {DURATIONS[mode]}m
                </Text>
                <Text style={[styles.modeLabel, { color: selectedMode === mode ? "#FFFFFFCC" : "#6B7280" }]}>
                  {MODE_LABELS[mode]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.timerContainer}>
            <ProgressRing
              size={220}
              strokeWidth={12}
              progress={isRunning ? progress : 0}
              color={catColor}
              trackColor="#1E1E2E"
            >
              <View style={styles.timerInner}>
                {isComplete ? (
                  <>
                    <Ionicons name="checkmark-circle" size={56} color="#10B981" />
                    <Text style={styles.doneText}>Done!</Text>
                    <Text style={styles.xpBadge}>+{xpEarned} XP</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.timeDisplay}>{timeStr}</Text>
                    <Text style={[styles.timeLabel, { color: "#6B7280" }]}>
                      {isRunning ? (isPaused ? "paused" : "remaining") : "ready"}
                    </Text>
                    {isRunning && xpEarned > 0 && (
                      <Text style={[styles.xpLive, { color: catColor }]}>+{xpEarned} XP</Text>
                    )}
                  </>
                )}
              </View>
            </ProgressRing>
          </View>

          {isComplete ? (
            <TouchableOpacity
              onPress={() => { setIsComplete(false); setTimeRemaining(DURATIONS[selectedMode] * 60); }}
              style={[styles.startBtn, { backgroundColor: catColor }]}
            >
              <Text style={styles.startBtnText}>Start Next Session</Text>
            </TouchableOpacity>
          ) : !isRunning ? (
            <TouchableOpacity onPress={handleStart} style={[styles.startBtn, { backgroundColor: catColor }]}>
              <Ionicons name="play" size={20} color="#FFF" />
              <Text style={styles.startBtnText}>Start Session</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.controlRow}>
              <TouchableOpacity onPress={handlePause} style={[styles.controlBtn, { backgroundColor: "#1A1A28", borderColor: "#1E1E2E" }]}>
                <Ionicons name={isPaused ? "play" : "pause"} size={22} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEnd} style={[styles.controlBtn, { backgroundColor: "#EF444422", borderColor: "#EF444444" }]}>
                <Ionicons name="stop" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          {!isRunning && todayTasks.length > 0 && (
            <View style={styles.taskPicker}>
              <Text style={styles.pickerLabel}>Choose a task</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  onPress={() => setSelectedTask(undefined)}
                  style={[styles.taskPickerBtn, {
                    backgroundColor: !selectedTask ? "#6366F133" : "#12121C",
                    borderColor: !selectedTask ? "#6366F1" : "#1E1E2E",
                  }]}
                >
                  <Text style={[styles.taskPickerBtnText, { color: !selectedTask ? "#818CF8" : "#6B7280" }]}>Free Focus</Text>
                </TouchableOpacity>
                {todayTasks.map((task) => {
                  const cc = getCategoryColor(task.categoryPrimary, true);
                  const isSelected = selectedTask?.id === task.id;
                  return (
                    <TouchableOpacity
                      key={task.id}
                      onPress={() => setSelectedTask(task)}
                      style={[styles.taskPickerBtn, {
                        backgroundColor: isSelected ? cc + "33" : "#12121C",
                        borderColor: isSelected ? cc : "#1E1E2E",
                      }]}
                    >
                      <Text style={[styles.taskPickerBtnText, { color: isSelected ? cc : "#6B7280" }]} numberOfLines={1}>
                        {task.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {isRunning && Platform.OS === "android" && (
            <View style={[styles.notifNote, { borderColor: catColor + "33" }]}>
              <Ionicons name="notifications-outline" size={13} color={catColor} />
              <Text style={[styles.notifNoteText, { color: "#6B7280" }]}>
                Timer is showing in your notification bar
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
      <MoodCheckInModal
        visible={showMoodCheck}
        taskTitle={selectedTask?.title}
        onClose={() => setShowMoodCheck(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFF" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EF444422", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444" },
  liveText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#EF4444", letterSpacing: 1 },
  content: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 60, gap: 24 },
  taskBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, alignSelf: "stretch" },
  taskDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  noTaskLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#6B7280" },
  modeRow: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  modeBtn: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 2 },
  modeBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modeLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  timerContainer: { marginVertical: 8 },
  timerInner: { alignItems: "center", gap: 4 },
  timeDisplay: { fontSize: 52, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: -2 },
  timeLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  xpLive: { fontSize: 16, fontFamily: "Inter_700Bold" },
  doneText: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#10B981" },
  xpBadge: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#F59E0B" },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, alignSelf: "stretch" },
  startBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  controlRow: { flexDirection: "row", gap: 16 },
  controlBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  taskPicker: { alignSelf: "stretch", gap: 10 },
  pickerLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#6B7280" },
  taskPickerBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, maxWidth: 160 },
  taskPickerBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  notifNote: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  notifNoteText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
