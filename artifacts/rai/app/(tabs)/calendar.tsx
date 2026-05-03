import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { TaskSheet } from "@/components/TaskSheet";
import { getCategoryColor } from "@/constants/categories";
import { Task } from "@/types";

type CalView = "day" | "week" | "month";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, completeTask, scheduleTask } = useApp();
  const [view, setView] = useState<CalView>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTaskSheet, setShowTaskSheet] = useState(false);
  const [prefillTime, setPrefillTime] = useState<string>();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const dateStr = selectedDate.toISOString().split("T")[0];
  const dayTasks = tasks.filter((t) => t.scheduledDate === dateStr && t.scheduledTime).sort((a, b) =>
    (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? "")
  );

  const goBack = () => {
    const d = new Date(selectedDate);
    if (view === "day") d.setDate(d.getDate() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setSelectedDate(d);
  };

  const goForward = () => {
    const d = new Date(selectedDate);
    if (view === "day") d.setDate(d.getDate() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const getDayLabel = () => {
    if (view === "day") {
      const isToday = dateStr === new Date().toISOString().split("T")[0];
      return isToday ? "Today" : selectedDate.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
    }
    if (view === "month") {
      return selectedDate.toLocaleDateString("en", { month: "long", year: "numeric" });
    }
    return selectedDate.toLocaleDateString("en", { month: "short", day: "numeric" });
  };

  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const { dangerZone } = useApp();

  const renderDayView = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.dayGrid}>
        {HOURS.map((hour) => {
          const hourStr = `${String(hour).padStart(2, "0")}:00`;
          const isDanger = dangerZone.dangerHours.includes(hour);
          const hourTasks = dayTasks.filter((t) => {
            const taskHour = parseInt((t.scheduledTime ?? "").split(":")[0]);
            return taskHour === hour;
          });
          const isNow = hour === currentHour && dateStr === new Date().toISOString().split("T")[0];

          return (
            <View key={hour} style={styles.hourRow}>
              <Text style={[styles.hourLabel, { color: colors.mutedForeground }]}>{hourStr}</Text>
              <TouchableOpacity
                style={[styles.hourSlot, {
                  backgroundColor: isDanger ? colors.dangerZoneBackground : "transparent",
                  borderColor: colors.border,
                }]}
                onPress={() => {
                  setPrefillTime(hourStr);
                  setShowTaskSheet(true);
                  Haptics.selectionAsync();
                }}
              >
                {isDanger && (
                  <View style={styles.dangerLabel}>
                    <Ionicons name="warning" size={10} color={colors.dangerZone} />
                    <Text style={[styles.dangerLabelText, { color: colors.dangerZone }]}>Danger zone</Text>
                  </View>
                )}
                {hourTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => completeTask(task.id)}
                    style={[styles.taskBlock, {
                      backgroundColor: getCategoryColor(task.categoryPrimary, true) + "CC",
                      height: Math.max(36, (task.estimatedMinutes / 60) * 60),
                    }]}
                  >
                    <Text style={styles.taskBlockText} numberOfLines={1}>{task.title}</Text>
                    <Text style={styles.taskBlockMeta}>{task.estimatedMinutes}min</Text>
                  </TouchableOpacity>
                ))}
                {isNow && (
                  <View style={[styles.nowLine, { backgroundColor: colors.primary, top: (currentMinute / 60) * 60 }]} />
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  const getWeekDays = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - d.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(d);
      day.setDate(d.getDate() + i);
      return day;
    });
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const todayStr = new Date().toISOString().split("T")[0];

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.weekHeader}>
          {weekDays.map((day) => {
            const ds = day.toISOString().split("T")[0];
            const dayTasks2 = tasks.filter((t) => t.scheduledDate === ds);
            const isToday = ds === todayStr;
            return (
              <TouchableOpacity key={ds} onPress={() => { setSelectedDate(day); setView("day"); }} style={styles.weekDayCol}>
                <Text style={[styles.weekDayName, { color: colors.mutedForeground }]}>
                  {day.toLocaleDateString("en", { weekday: "short" }).slice(0, 1)}
                </Text>
                <View style={[styles.weekDayNum, {
                  backgroundColor: isToday ? colors.primary : "transparent",
                }]}>
                  <Text style={[styles.weekDayNumText, { color: isToday ? "#FFF" : colors.foreground }]}>
                    {day.getDate()}
                  </Text>
                </View>
                <View style={styles.weekTaskDots}>
                  {dayTasks2.slice(0, 3).map((t) => (
                    <View key={t.id} style={[styles.weekDot, { backgroundColor: getCategoryColor(t.categoryPrimary, true) }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ padding: 16, gap: 10 }}>
          {weekDays.map((day) => {
            const ds = day.toISOString().split("T")[0];
            const dayTasks2 = tasks.filter((t) => t.scheduledDate === ds && !t.completed).slice(0, 3);
            if (dayTasks2.length === 0) return null;
            return (
              <View key={ds}>
                <Text style={[styles.weekSectionTitle, { color: colors.mutedForeground }]}>
                  {day.toLocaleDateString("en", { weekday: "long", day: "numeric" })}
                </Text>
                {dayTasks2.map((task) => (
                  <View key={task.id} style={[styles.weekTaskRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.weekTaskColor, { backgroundColor: getCategoryColor(task.categoryPrimary, true) }]} />
                    <Text style={[styles.weekTaskTitle, { color: colors.foreground }]}>{task.title}</Text>
                    <Text style={[styles.weekTaskTime, { color: colors.mutedForeground }]}>{task.scheduledTime}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderMonthView = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split("T")[0];

    const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => {
      if (i < firstDay) return null;
      const day = i - firstDay + 1;
      const d = new Date(year, month, day);
      const ds = d.toISOString().split("T")[0];
      const dt = tasks.filter((t) => t.scheduledDate === ds);
      return { day, ds, tasks: dt };
    });

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.monthGrid}>
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
            <Text key={d} style={[styles.monthDayHeader, { color: colors.mutedForeground }]}>{d}</Text>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <View key={`empty-${i}`} style={styles.monthCell} />;
            const isToday = cell.ds === todayStr;
            const isSelected = cell.ds === dateStr;
            return (
              <TouchableOpacity
                key={cell.ds}
                style={[styles.monthCell, isSelected && { backgroundColor: colors.primary + "22", borderRadius: 10 }]}
                onPress={() => { setSelectedDate(new Date(cell.ds)); setView("day"); }}
              >
                <View style={[styles.monthDayCircle, {
                  backgroundColor: isToday ? colors.primary : "transparent",
                }]}>
                  <Text style={[styles.monthDayNum, { color: isToday ? "#FFF" : colors.foreground }]}>
                    {cell.day}
                  </Text>
                </View>
                <View style={styles.monthDots}>
                  {cell.tasks.slice(0, 3).map((t) => (
                    <View key={t.id} style={[styles.monthDot, { backgroundColor: getCategoryColor(t.categoryPrimary, true) }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={goBack}>
              <Ionicons name="chevron-back" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.dateLabel, { color: colors.foreground }]}>{getDayLabel()}</Text>
            <TouchableOpacity onPress={goForward}>
              <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => { setShowTaskSheet(true); }}>
            <Ionicons name="flash" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.viewRow}>
          {(["day", "week", "month"] as CalView[]).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setView(v)}
              style={[styles.viewBtn, {
                backgroundColor: view === v ? colors.primary : colors.secondary,
                borderColor: view === v ? colors.primary : colors.border,
              }]}
            >
              <Text style={[styles.viewBtnText, { color: view === v ? "#FFF" : colors.mutedForeground }]}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {view === "day" && renderDayView()}
      {view === "week" && renderWeekView()}
      {view === "month" && renderMonthView()}

      <TaskSheet
        visible={showTaskSheet}
        onClose={() => { setShowTaskSheet(false); setPrefillTime(undefined); }}
        prefillTime={prefillTime}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, gap: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  viewRow: { flexDirection: "row", gap: 8 },
  viewBtn: { flex: 1, borderRadius: 8, borderWidth: 1, paddingVertical: 6, alignItems: "center" },
  viewBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dayGrid: { padding: 0 },
  hourRow: { flexDirection: "row", minHeight: 60 },
  hourLabel: { width: 52, paddingHorizontal: 8, paddingTop: 8, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  hourSlot: { flex: 1, borderTopWidth: 1, paddingHorizontal: 4, paddingTop: 4, paddingBottom: 4, minHeight: 60, position: "relative", gap: 2 },
  dangerLabel: { flexDirection: "row", alignItems: "center", gap: 3 },
  dangerLabelText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  taskBlock: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, justifyContent: "center" },
  taskBlockText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  taskBlockMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#FFFFFFAA" },
  nowLine: { position: "absolute", left: 0, right: 0, height: 2, borderRadius: 1 },
  weekHeader: { flexDirection: "row", padding: 8, gap: 4 },
  weekDayCol: { flex: 1, alignItems: "center", gap: 4 },
  weekDayName: { fontSize: 11, fontFamily: "Inter_500Medium" },
  weekDayNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  weekDayNumText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  weekTaskDots: { flexDirection: "row", gap: 2, flexWrap: "wrap", justifyContent: "center" },
  weekDot: { width: 5, height: 5, borderRadius: 3 },
  weekSectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 12, marginBottom: 6 },
  weekTaskRow: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, padding: 10, gap: 8, marginBottom: 6 },
  weekTaskColor: { width: 3, height: 24, borderRadius: 2 },
  weekTaskTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  weekTaskTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", padding: 8 },
  monthDayHeader: { width: `${100 / 7}%`, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold", paddingVertical: 6 },
  monthCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", paddingTop: 4 },
  monthDayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  monthDayNum: { fontSize: 13, fontFamily: "Inter_500Medium" },
  monthDots: { flexDirection: "row", gap: 2 },
  monthDot: { width: 4, height: 4, borderRadius: 2 },
});
