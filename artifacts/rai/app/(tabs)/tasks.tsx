import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, useColorScheme, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { TaskCard } from "@/components/TaskCard";
import { TaskSheet } from "@/components/TaskSheet";
import { MoodCheckInModal } from "@/components/MoodCheckInModal";
import { Task } from "@/types";

const ALL_FILTER = "All";

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const { tasks, completeTask, deleteTask, scheduleTask } = useApp();

  const [showTaskSheet, setShowTaskSheet] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);
  const [searchQuery, setSearchQuery] = useState("");
  const [moodCheckTask, setMoodCheckTask] = useState<Task | null>(null);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    tasks.forEach((t) => cats.add(t.categoryPrimary));
    return [ALL_FILTER, ...Array.from(cats)];
  }, [tasks]);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchesFilter = activeFilter === ALL_FILTER || t.categoryPrimary === activeFilter;
      const matchesSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [tasks, activeFilter, searchQuery]);

  const todayTasks = filtered.filter((t) => t.scheduledDate === today);
  const tomorrowTasks = filtered.filter((t) => t.scheduledDate === tomorrowStr);
  const unscheduled = filtered.filter((t) => !t.scheduledDate && !t.completed);
  const completed = filtered.filter((t) => t.completed).slice(0, 10);
  const upcoming = filtered.filter((t) => t.scheduledDate && t.scheduledDate > tomorrowStr && !t.completed);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleComplete = (task: Task) => {
    completeTask(task.id);
    setMoodCheckTask(task);
  };

  const renderSection = (title: string, sectionTasks: Task[], showSchedule = false) => {
    if (sectionTasks.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
            {sectionTasks.filter((t) => t.completed).length}/{sectionTasks.length}
          </Text>
        </View>
        {sectionTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={() => handleComplete(task)}
            onEdit={() => { setEditingTask(task); setShowTaskSheet(true); }}
            onDelete={() => deleteTask(task.id)}
            showDate={showSchedule}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Tasks</Text>
          <TouchableOpacity
            onPress={() => { setEditingTask(undefined); setShowTaskSheet(true); }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search tasks..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveFilter(item)}
              style={[styles.filterChip, {
                backgroundColor: activeFilter === item ? colors.primary : colors.card,
                borderColor: activeFilter === item ? colors.primary : colors.border,
              }]}
            >
              <Text style={[styles.filterText, { color: activeFilter === item ? "#FFF" : colors.mutedForeground }]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={[1]}
        renderItem={() => (
          <View style={{ paddingHorizontal: 16, paddingBottom: 100 }}>
            {unscheduled.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Unscheduled</Text>
                  <TouchableOpacity
                    onPress={() => unscheduled.forEach((t) => scheduleTask(t.id))}
                    style={[styles.autoScheduleBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  >
                    <Ionicons name="flash" size={13} color={colors.primary} />
                    <Text style={[styles.autoScheduleText, { color: colors.primary }]}>Auto-schedule all</Text>
                  </TouchableOpacity>
                </View>
                {unscheduled.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={() => handleComplete(task)}
                    onEdit={() => { setEditingTask(task); setShowTaskSheet(true); }}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </View>
            )}
            {renderSection("Today", todayTasks)}
            {renderSection("Tomorrow", tomorrowTasks)}
            {renderSection("Upcoming", upcoming, true)}
            {renderSection("Completed", completed)}

            {filtered.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="clipboard-outline" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {searchQuery ? "No tasks found" : "No tasks yet"}
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                  {searchQuery ? "Try a different search" : "Add your first task and let RAI schedule it"}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity
                    onPress={() => setShowTaskSheet(true)}
                    style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.emptyBtnText}>Add Task</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
        keyExtractor={() => "content"}
        showsVerticalScrollIndicator={false}
      />

      <TaskSheet
        visible={showTaskSheet}
        task={editingTask}
        onClose={() => { setShowTaskSheet(false); setEditingTask(undefined); }}
      />

      <MoodCheckInModal
        visible={!!moodCheckTask}
        taskTitle={moodCheckTask?.title}
        onClose={() => setMoodCheckTask(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, gap: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  filterRow: { paddingVertical: 4, gap: 8 },
  filterChip: { borderRadius: 100, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  filterText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  section: { marginTop: 16, gap: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionCount: { fontSize: 13, fontFamily: "Inter_500Medium" },
  autoScheduleBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  autoScheduleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyState: { borderRadius: 16, borderWidth: 1, padding: 40, alignItems: "center", gap: 10, marginTop: 24 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 6 },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },
});
