import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Animated, Switch
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Task, TaskCategory, TaskPriority, TaskDifficulty } from "@/types";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { categorizeTaskLocal, parseDurationFromText, parsePriorityFromText, parseDeadlineFromText } from "@/lib/categorizer";
import { CATEGORIES } from "@/constants/categories";
import { getCategoryColor } from "@/constants/categories";

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

export function TaskSheet({ visible, task, onClose, onSave, prefillTime }: Props) {
  const colors = useColors();
  const { addTask, updateTask, scheduleTask } = useApp();

  const [title, setTitle] = useState(task?.title ?? "");
  const [category, setCategory] = useState<TaskCategory>(task?.categoryPrimary ?? "Work");
  const [duration, setDuration] = useState(task?.estimatedMinutes ?? 60);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 2);
  const [difficulty, setDifficulty] = useState<TaskDifficulty>(task?.difficulty ?? 3);
  const [moodSensitive, setMoodSensitive] = useState(task?.moodSensitive ?? false);
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const parseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setCategory(task.categoryPrimary);
      setDuration(task.estimatedMinutes);
      setPriority(task.priority);
      setDifficulty(task.difficulty);
      setMoodSensitive(task.moodSensitive);
      setNotes(task.notes ?? "");
    } else {
      setTitle("");
      setCategory("Work");
      setDuration(60);
      setPriority(2);
      setDifficulty(3);
      setMoodSensitive(false);
      setNotes("");
    }
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
        await updateTask(task.id, { title, categoryPrimary: category, estimatedMinutes: duration, priority, difficulty, moodSensitive, notes });
        if (andSchedule) await scheduleTask(task.id);
        onSave?.({ ...task, title, categoryPrimary: category, estimatedMinutes: duration, priority, difficulty, moodSensitive, notes });
      } else {
        const newTask = await addTask({
          title,
          categoryPrimary: category,
          estimatedMinutes: duration,
          priority,
          difficulty,
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

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

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
                <TextInput
                  style={[styles.titleInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                  placeholder="What do you need to do? Try: 'finish report by Friday, 2 hours, urgent'"
                  placeholderTextColor={colors.mutedForeground}
                  value={title}
                  onChangeText={handleTitleChange}
                  multiline
                  autoFocus
                />

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

                <TextInput
                  style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                  placeholder="Notes (optional)"
                  placeholderTextColor={colors.mutedForeground}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                />

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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 32, maxHeight: "90%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  form: { gap: 12 },
  titleInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 56, textAlignVertical: "top" },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: -4 },
  categoryRow: { flexDirection: "row" },
  catBtn: { borderRadius: 100, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
  catBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  durationRow: { flexDirection: "row", gap: 8 },
  durationBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" },
  durationBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
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
