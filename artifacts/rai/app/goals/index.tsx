import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { ProgressRing } from "@/components/ProgressRing";
import { SwipeableSheet } from "@/components/SwipeableSheet";
import { Goal, Milestone } from "@/types";

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { goals, addGoal, updateGoal } = useApp();
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalType, setGoalType] = useState("");
  const [milestoneText, setMilestoneText] = useState("");
  const [milestones, setMilestones] = useState<string[]>([]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const addMilestone = () => {
    if (!milestoneText.trim()) return;
    setMilestones((prev) => [...prev, milestoneText.trim()]);
    setMilestoneText("");
  };

  const handleCreateGoal = async () => {
    if (!goalTitle.trim()) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addGoal({
      title: goalTitle.trim(),
      type: goalType || "General",
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      milestones: milestones.map((m, i) => ({
        id: genId(),
        title: m,
        completed: false,
        order: i,
      })),
      categoryBreakdown: {},
    });
    setGoalTitle("");
    setGoalType("");
    setMilestones([]);
    setShowAddGoal(false);
  };

  const toggleMilestone = async (goalId: string, milestoneId: string) => {
    await Haptics.selectionAsync();
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const updated = goal.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : undefined } : m
    );
    const progress = (updated.filter((m) => m.completed).length / updated.length) * 100;
    await updateGoal(goalId, { milestones: updated, progress: Math.round(progress) });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Goals</Text>
        <TouchableOpacity onPress={() => setShowAddGoal(true)}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
        {goals.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="flag" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No goals yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Set a big goal and break it into milestones. RAI will track your progress.
            </Text>
            <TouchableOpacity onPress={() => setShowAddGoal(true)} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.emptyBtnText}>Create First Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((goal) => {
            const daysLeft = Math.max(0, Math.floor((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            const completed = goal.milestones.filter((m) => m.completed).length;
            const total = goal.milestones.length;

            return (
              <View key={goal.id} style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalMeta}>
                    <Text style={[styles.goalTitle, { color: colors.foreground }]}>{goal.title}</Text>
                    <Text style={[styles.goalType, { color: colors.mutedForeground }]}>{goal.type}</Text>
                  </View>
                  <ProgressRing size={64} strokeWidth={6} progress={(goal.progress ?? 0) / 100} color={colors.primary} trackColor={colors.border}>
                    <Text style={[styles.progressNum, { color: colors.primary }]}>{goal.progress ?? 0}%</Text>
                  </ProgressRing>
                </View>

                <View style={[styles.daysLeft, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.daysLeftText, { color: colors.mutedForeground }]}>
                    {daysLeft} days remaining
                  </Text>
                  <Text style={[styles.milestonePct, { color: colors.primary }]}>
                    {completed}/{total} milestones
                  </Text>
                </View>

                {goal.milestones.length > 0 && (
                  <View style={styles.milestoneList}>
                    <Text style={[styles.milestonesLabel, { color: colors.mutedForeground }]}>MILESTONES</Text>
                    <View style={styles.milestoneLine}>
                      {goal.milestones.map((m, i) => (
                        <View key={m.id} style={styles.milestoneStep}>
                          <TouchableOpacity
                            onPress={() => toggleMilestone(goal.id, m.id)}
                            style={[styles.milestoneDot, {
                              backgroundColor: m.completed ? colors.primary : colors.background,
                              borderColor: m.completed ? colors.primary : colors.border,
                            }]}
                          >
                            {m.completed && <Ionicons name="checkmark" size={10} color="#FFF" />}
                          </TouchableOpacity>
                          <Text style={[styles.milestoneTitle, { color: m.completed ? colors.primary : colors.foreground }]} numberOfLines={2}>
                            {m.title}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <SwipeableSheet
        visible={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        backgroundColor={colors.card}
        handleColor={colors.border}
      >
        <View style={styles.modalSheetInner}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Goal</Text>

            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.secondary }]}
              placeholder="What's your big goal?"
              placeholderTextColor={colors.mutedForeground}
              value={goalTitle}
              onChangeText={setGoalTitle}
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.secondary }]}
              placeholder="Type (e.g. Career, Health, Learning)"
              placeholderTextColor={colors.mutedForeground}
              value={goalType}
              onChangeText={setGoalType}
            />

            <Text style={[styles.milestonesLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>MILESTONES</Text>
            {milestones.map((m, i) => (
              <View key={i} style={[styles.milestoneRow, { backgroundColor: colors.secondary }]}>
                <View style={[styles.milestoneNumBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.milestoneNum}>{i + 1}</Text>
                </View>
                <Text style={[styles.milestoneRowText, { color: colors.foreground }]}>{m}</Text>
                <TouchableOpacity onPress={() => setMilestones((prev) => prev.filter((_, j) => j !== i))}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.milestoneInputRow}>
              <TextInput
                style={[styles.milestoneInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.secondary }]}
                placeholder="Add milestone..."
                placeholderTextColor={colors.mutedForeground}
                value={milestoneText}
                onChangeText={setMilestoneText}
                onSubmitEditing={addMilestone}
              />
              <TouchableOpacity onPress={addMilestone} style={[styles.addMilestoneBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

          <TouchableOpacity onPress={handleCreateGoal} style={[styles.createBtn, { backgroundColor: colors.primary }]} disabled={!goalTitle.trim()}>
            <Text style={styles.createBtnText}>Create Goal</Text>
          </TouchableOpacity>
        </View>
      </SwipeableSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 16 },
  emptyState: { borderRadius: 20, borderWidth: 1, padding: 40, alignItems: "center", gap: 12, marginTop: 24 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  emptyBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  emptyBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  goalCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalMeta: { flex: 1, gap: 4 },
  goalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  goalType: { fontSize: 13, fontFamily: "Inter_400Regular" },
  progressNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  daysLeft: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 10 },
  daysLeftText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  milestonePct: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  milestoneList: { gap: 10 },
  milestonesLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  milestoneLine: { gap: 10 },
  milestoneStep: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  milestoneDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  milestoneTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 20 },
  modalSheetInner: { padding: 20, paddingBottom: 40, gap: 14 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modalInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  milestoneRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, padding: 10, marginBottom: 6 },
  milestoneNumBadge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  milestoneNum: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFF" },
  milestoneRowText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  milestoneInputRow: { flexDirection: "row", gap: 10 },
  milestoneInput: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  addMilestoneBtn: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  createBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  createBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
