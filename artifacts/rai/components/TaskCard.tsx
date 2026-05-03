import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Alert } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Task } from "@/types";
import { useColors } from "@/hooks/useColors";
import { getCategoryColor } from "@/constants/categories";
import { CategoryChip } from "./CategoryChip";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/constants/categories";

interface Props {
  task: Task;
  onComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showDate?: boolean;
}

export function TaskCard({ task, onComplete, onEdit, onDelete, showDate }: Props) {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const catColor = getCategoryColor(task.categoryPrimary, isDark);

  const handleComplete = useCallback(async () => {
    if (task.completed) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete?.();
  }, [task.completed, onComplete]);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete Task", `Delete "${task.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  }, [task.title, onDelete]);

  return (
    <View style={[styles.container, {
      backgroundColor: colors.card,
      borderColor: colors.border,
      opacity: task.completed ? 0.6 : 1,
    }]}>
      <View style={[styles.categoryBar, { backgroundColor: catColor }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
            <Text style={[styles.title, {
              color: colors.foreground,
              textDecorationLine: task.completed ? "line-through" : "none",
            }]} numberOfLines={2}>
              {task.title}
            </Text>
          </View>
          <View style={styles.actions}>
            {!task.completed && onEdit && (
              <TouchableOpacity onPress={onEdit} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="edit-2" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="trash-2" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.meta}>
          <CategoryChip category={task.categoryPrimary} />
          <View style={[styles.metaChip, { backgroundColor: colors.secondary }]}>
            <Ionicons name="time-outline" size={10} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {task.estimatedMinutes}min
            </Text>
          </View>
          {task.scheduledTime && (
            <View style={[styles.metaChip, { backgroundColor: colors.secondary }]}>
              <Ionicons name="calendar-outline" size={10} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {showDate && task.scheduledDate ? task.scheduledDate.slice(5) + " " : ""}
                {task.scheduledTime}
              </Text>
            </View>
          )}
          {task.deadline && !task.completed && (() => {
            const dl = new Date(task.deadline);
            const now = new Date();
            const diffDays = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isOverdue = diffDays < 0;
            const isSoon = diffDays <= 2;
            const label = isOverdue
              ? `${Math.abs(diffDays)}d overdue`
              : diffDays === 0
              ? "Due today"
              : diffDays === 1
              ? "Due tomorrow"
              : `Due ${dl.toLocaleDateString("en", { month: "short", day: "numeric" })}`;
            const chipColor = isOverdue ? "#EF4444" : isSoon ? "#F97316" : colors.mutedForeground;
            return (
              <View style={[styles.metaChip, { backgroundColor: chipColor + "22" }]}>
                <Ionicons name="flag-outline" size={10} color={chipColor} />
                <Text style={[styles.metaText, { color: chipColor }]}>{label}</Text>
              </View>
            );
          })()}
          <View style={[styles.metaChip, { backgroundColor: PRIORITY_COLORS[task.priority] + "22" }]}>
            <Text style={[styles.metaText, { color: PRIORITY_COLORS[task.priority] }]}>
              {PRIORITY_LABELS[task.priority]}
            </Text>
          </View>
        </View>

        {task.schedulerRationale && !task.completed && (
          <Text style={[styles.rationale, { color: colors.mutedForeground }]} numberOfLines={2}>
            {task.schedulerRationale}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={handleComplete}
        style={[styles.checkbox, {
          borderColor: task.completed ? colors.success : catColor,
          backgroundColor: task.completed ? colors.success : "transparent",
        }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {task.completed && (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  categoryBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    padding: 2,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
  },
  metaText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  rationale: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
    fontStyle: "italic",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    margin: 12,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
});
