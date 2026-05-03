import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Switch
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Task, TaskCategory, TaskPriority, TaskDifficulty } from "@/types";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { categorizeTaskLocal, parseDurationFromText, parsePriorityFromText } from "@/lib/categorizer";
import { CATEGORIES, getCategoryColor } from "@/constants/categories";
import { SwipeableSheet } from "@/components/SwipeableSheet";

interface Props {
  visible: boolean;
  task?: Task;
  onClose: () => void;
  onSave?: (task: Task) => void;
  prefillTime?: string;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 1, label: "Low", color: "#6B7280" },
  { value: 2, label: "Medium", color: "#F59E0B" },
  { value: 3, label: "High", color: "#F97316" },
  { value: 4, label: "Urgent", color: "#EF4444" },
];

const QUICK_DURATIONS = [15, 30, 60, 90, 120];

// Quick deadline presets
const DEADLINE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
  { label: "In 2 weeks", days: 14 },
  { label: "In a month", days: 30 },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function formatDeadlineDisplay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff < 7) return `In ${diff} days`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TaskSheet({ visible, task, onClose, onSave, prefillTime }: Props) {
  const colors = useColors();
  const { addTask, updateTask, scheduleTask } = useApp();

  const [title, setTitle] = useState(task?.title ?? "");
  const [category, setCategory] = useState<TaskCategory>(task?.categoryPrimary ?? "Work");
  const [duration, setDuration] = useState(task?.estimatedMinutes ?? 60);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 2);
  const [difficulty, setDifficulty] = useState<TaskDifficulty>(task?.difficulty ?? 3);
  const [deadline, setDeadline] = useState<string | undefined>(task?.deadline);
  const [moodSensitive, setMoodSensitive] = useState(task?.moodSensitive ?? false);
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const parseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setCategory(task.categoryPrimary);
      setDuration(task.estimatedMinutes);
      setPriority(task.priority);
      setDifficulty(task.difficulty);
      setDeadline(task.deadline);
      setMoodSensitive(task.moodSensitive);
      setNotes(task.notes ?? "");
    } else {
      setTitle("");
      setCategory("Work");
      setDuration(60);
      setPriority(2);
      setDifficulty(3);
      setDeadline(undefined);
      setMoodSensitive(false);
      setNotes("");
    }
    setShowDeadlinePicker(false);
  }, [task, visible]);

  const handleTitleChange = (text: string) => {
    setTitle(text);
    if (parseTimeout.current) clearTimeout(parseTimeout.current);
    parseTimeout.current = setTimeout(() => {
      if (text.length > 8) {
        const detectedCat = categorizeTaskLocal(text);
        setCategory(detectedCat);
        const detectedDuration = parseDurationFromText(text);
        if (detectedDuration > 0) setDuration(detectedDuration);
        const detectedPriority = parsePriorityFromText(text);
        setPriority(detectedPriority);
      }
    }, 800);
  };

  const handleSave = async (andSchedule = false) => {
    if (!title.trim()) return;
    setIsSaving(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (task) {
        await updateTask(task.id, {
          title, categoryPrimary: category, estimatedMinutes: duration,
          priority, difficulty, deadline, moodSensitive, notes,
        });
        if (andSchedule) await scheduleTask(task.id);
        onSave?.({ ...task, title, categoryPrimary: category, estimatedMinutes: duration, priority, difficulty, deadline, moodSensitive, notes });
      } else {
        const newTask = await addTask({
          title,
          categoryPrimary: category,
          estimatedMinutes: duration,
          priority,
          difficulty,
          deadline,
          moodSensitive,
          notes,
          isRecurring: false,
          scheduledTime: prefillTime,
        });
        if (andSchedule) await scheduleTask(newTask.id);
        onSave?.(newTask);
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const isDeadlineOverdue = deadline && new Date(deadline + "T00:00:00") < new Date(new Date().toDateString());

  return (
    <SwipeableSheet
      visible={visible}
      onClose={onClose}
      backgroundColor={colors.card}
      handleColor={colors.border}
      maxHeight="92%"
    >
      <View style={styles.sheetHeader}>
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
          {task ? "Edit Task" : "New Task"}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>

                {/* Title */}
                <TextInput
                  style={[styles.titleInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                  placeholder="What do you need to do?"
                  placeholderTextColor={colors.mutedForeground}
                  value={title}
                  onChangeText={handleTitleChange}
                  multiline
                  autoFocus
                />

                {/* Category */}
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                  {Object.keys(CATEGORIES).map((cat) => {
                    const isSelected = category === cat;
                    const catColor = getCategoryColor(cat, true);
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setCategory(cat as TaskCategory)}
                        style={[styles.catBtn, {
                          backgroundColor: isSelected ? catColor : colors.secondary,
                          borderColor: isSelected ? catColor : colors.border,
                        }]}
                      >
                        <Text style={[styles.catBtnText, { color: isSelected ? "#FFF" : colors.mutedForeground }]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Duration */}
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Duration</Text>
                <View style={styles.durationRow}>
                  {QUICK_DURATIONS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setDuration(d)}
                      style={[styles.durationBtn, {
                        backgroundColor: duration === d ? colors.primary : colors.secondary,
                        borderColor: duration === d ? colors.primary : colors.border,
                      }]}
                    >
                      <Text style={[styles.durationBtnText, { color: duration === d ? "#FFF" : colors.mutedForeground }]}>
                        {d < 60 ? `${d}m` : `${d / 60}h`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Deadline */}
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Deadline</Text>
                <TouchableOpacity
                  onPress={() => setShowDeadlinePicker((p) => !p)}
                  style={[styles.deadlineBtn, {
                    backgroundColor: colors.secondary,
                    borderColor: deadline
                      ? isDeadlineOverdue ? "#EF4444" : "#6366F1"
                      : colors.border,
                    borderWidth: deadline ? 1.5 : 1,
                  }]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={deadline ? (isDeadlineOverdue ? "#EF4444" : "#6366F1") : colors.mutedForeground}
                  />
                  <Text style={[styles.deadlineBtnText, {
                    color: deadline
                      ? isDeadlineOverdue ? "#EF4444" : colors.foreground
                      : colors.mutedForeground,
                  }]}>
                    {deadline ? formatDeadlineDisplay(deadline) : "No deadline"}
                  </Text>
                  {deadline && (
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); setDeadline(undefined); setShowDeadlinePicker(false); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                  <Ionicons
                    name={showDeadlinePicker ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={colors.mutedForeground}
                    style={{ marginLeft: "auto" }}
                  />
                </TouchableOpacity>

                {showDeadlinePicker && (
                  <View style={[styles.deadlineGrid, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    {DEADLINE_PRESETS.map((preset) => {
                      const val = addDays(preset.days);
                      const isActive = deadline === val;
                      return (
                        <TouchableOpacity
                          key={preset.label}
                          onPress={() => { setDeadline(val); setShowDeadlinePicker(false); }}
                          style={[styles.deadlinePreset, {
                            backgroundColor: isActive ? "#6366F1" : colors.card,
                            borderColor: isActive ? "#6366F1" : colors.border,
                          }]}
                        >
                          <Text style={[styles.deadlinePresetText, { color: isActive ? "#FFF" : colors.foreground }]}>
                            {preset.label}
                          </Text>
                          <Text style={[styles.deadlinePresetDate, { color: isActive ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
                            {new Date(val + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Priority */}
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Priority</Text>
                <View style={styles.priorityRow}>
                  {PRIORITY_OPTIONS.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => setPriority(p.value)}
                      style={[styles.priorityBtn, {
                        backgroundColor: priority === p.value ? p.color : colors.secondary,
                        borderColor: priority === p.value ? p.color : colors.border,
                      }]}
                    >
                      <Text style={[styles.priorityBtnText, { color: priority === p.value ? "#FFF" : colors.mutedForeground }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Difficulty */}
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Difficulty</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <TouchableOpacity key={d} onPress={() => setDifficulty(d as TaskDifficulty)}>
                      <Ionicons
                        name={d <= difficulty ? "star" : "star-outline"}
                        size={28}
                        color={d <= difficulty ? "#F59E0B" : colors.border}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Mood Sensitive */}
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={[styles.switchLabel, { color: colors.foreground }]}>Mood Sensitive</Text>
                    <Text style={[styles.switchDesc, { color: colors.mutedForeground }]}>Reschedule if I'm not feeling it</Text>
                  </View>
                  <Switch
                    value={moodSensitive}
                    onValueChange={setMoodSensitive}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Notes */}
                <TextInput
                  style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                  placeholder="Notes (optional)"
                  placeholderTextColor={colors.mutedForeground}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                />

                {/* Actions */}
                <View style={styles.saveRow}>
                  <TouchableOpacity
                    onPress={() => handleSave(false)}
                    style={[styles.saveBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
                    disabled={isSaving}
                  >
                    <Feather name="save" size={16} color={colors.foreground} />
                    <Text style={[styles.saveBtnText, { color: colors.foreground }]}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleSave(true)}
                    style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    disabled={isSaving}
                  >
                    <Ionicons name="flash" size={16} color="#FFFFFF" />
                    <Text style={[styles.saveBtnText, { color: "#FFFFFF" }]}>Auto-Schedule</Text>
                  </TouchableOpacity>
                </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SwipeableSheet>
  );
}

const styles = StyleSheet.create({
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingHorizontal: 16, paddingTop: 4 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  form: { gap: 12, paddingHorizontal: 16, paddingBottom: 32 },
  titleInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 56, textAlignVertical: "top" },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: -4 },
  categoryRow: { flexDirection: "row" },
  catBtn: { borderRadius: 100, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
  catBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  durationRow: { flexDirection: "row", gap: 8 },
  durationBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" },
  durationBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  deadlineBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  deadlineBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  deadlineGrid: {
    borderRadius: 12, borderWidth: 1, padding: 10,
    flexDirection: "row", flexWrap: "wrap", gap: 8,
  },
  deadlinePreset: {
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
    minWidth: "30%", flex: 1,
  },
  deadlinePresetText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  deadlinePresetDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityBtn: { flex: 1, borderRadius: 8, borderWidth: 1, paddingVertical: 8, alignItems: "center" },
  priorityBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  starRow: { flexDirection: "row", gap: 8 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  switchInfo: { flex: 1 },
  switchLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  switchDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  notesInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 52, textAlignVertical: "top" },
  saveRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
