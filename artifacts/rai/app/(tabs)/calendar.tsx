import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  Modal, Pressable, TextInput, KeyboardAvoidingView, ActivityIndicator,
  LayoutAnimation,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { TaskSheet } from "@/components/TaskSheet";
import { getCategoryColor } from "@/constants/categories";
import { chatWithScheduler, SchedulerAction } from "@/lib/ai";
import { Task } from "@/types";

type CalView = "day" | "week" | "month";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  action?: SchedulerAction;
  applied?: boolean;
}

const HOUR_HEIGHT = 64;
const START_HOUR = 6;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIMELINE_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const LABEL_WIDTH = 54;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTop(minutes: number): number {
  return Math.max(0, (minutes - START_HOUR * 60) * (HOUR_HEIGHT / 60));
}

function clampTaskHeight(estimatedMinutes: number): number {
  return Math.max(28, estimatedMinutes * (HOUR_HEIGHT / 60));
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${ampm}`;
}

function todayStr(): string { return new Date().toISOString().split("T")[0]; }

// ── Draggable Task Block ────────────────────────────────────────────────────
interface DraggableTaskBlockProps {
  task: Task;
  col: number;
  totalCols: number;
  isExpanded: boolean;
  onTimeChange: (time: string) => void;
  onComplete: () => void;
  onTap: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  colors: ReturnType<typeof useColors>;
}

function DraggableTaskBlock({
  task, col, totalCols, isExpanded,
  onTimeChange, onComplete, onTap,
  onDragStart, onDragEnd, colors,
}: DraggableTaskBlockProps) {
  const catColor = getCategoryColor(task.categoryPrimary, true);
  const startMin = timeToMinutes(task.scheduledTime ?? "00:00");
  const top = minutesToTop(startMin);
  const height = clampTaskHeight(task.estimatedMinutes ?? 30);

  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const elevation = useSharedValue(0);

  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(task.scheduledTime ?? "00:00");
  const [swiping, setSwiping] = useState<"right" | "left" | null>(null);

  const updateDragTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    setDragTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const commitTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    onTimeChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(320)
    .onStart(() => {
      "worklet";
      scale.value = withSpring(1.05);
      elevation.value = 12;
      runOnJS(setIsDragging)(true);
      runOnJS(onDragStart)();
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    })
    .onUpdate((e) => {
      "worklet";
      translateY.value = e.translationY;
      const rawMins = startMin + Math.round(e.translationY / (HOUR_HEIGHT / 60));
      const snapped = Math.round(rawMins / 15) * 15;
      const clamped = Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60, snapped));
      runOnJS(updateDragTime)(clamped);
    })
    .onEnd((e) => {
      "worklet";
      scale.value = withSpring(1);
      elevation.value = 0;
      const rawMins = startMin + Math.round(e.translationY / (HOUR_HEIGHT / 60));
      const snapped = Math.round(rawMins / 15) * 15;
      const clamped = Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60, snapped));
      translateY.value = withSpring(0);
      runOnJS(setIsDragging)(false);
      runOnJS(onDragEnd)();
      runOnJS(commitTime)(clamped);
      runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
    })
    .onFinalize(() => {
      "worklet";
      scale.value = withSpring(1);
      elevation.value = 0;
      translateY.value = withSpring(0);
      runOnJS(setIsDragging)(false);
      runOnJS(onDragEnd)();
    });

  const swipeGesture = Gesture.Pan()
    .minDistance(15)
    .onUpdate((e) => {
      "worklet";
      const isHoriz = Math.abs(e.translationX) > Math.abs(e.translationY) * 1.3;
      if (!isHoriz) return;
      translateX.value = e.translationX * 0.6;
      if (e.translationX > 30) runOnJS(setSwiping)("right");
      else if (e.translationX < -30) runOnJS(setSwiping)("left");
      else runOnJS(setSwiping)(null);
    })
    .onEnd((e) => {
      "worklet";
      const isHoriz = Math.abs(e.translationX) > Math.abs(e.translationY) * 1.3;
      if (isHoriz && e.translationX > 72) {
        translateX.value = withSpring(300, {}, () => {
          runOnJS(onComplete)();
        });
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
      } else if (isHoriz && e.translationX < -72) {
        translateX.value = withSpring(0);
        runOnJS(setSwiping)(null);
      } else {
        translateX.value = withSpring(0);
        runOnJS(setSwiping)(null);
      }
    })
    .onFinalize(() => {
      "worklet";
      if (translateX.value < 200) {
        translateX.value = withSpring(0);
        runOnJS(setSwiping)(null);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    "worklet";
    runOnJS(onTap)();
  });

  const composed = Gesture.Race(dragGesture, swipeGesture, tapGesture);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    zIndex: elevation.value > 0 ? 100 : 5,
    shadowOpacity: elevation.value > 0 ? 0.4 : 0,
    shadowRadius: elevation.value,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: elevation.value > 0 ? 6 : 0 },
    elevation: elevation.value,
  }));

  const colWidth = `${(1 / totalCols) * 100}%` as any;
  const colLeft = `${(col / totalCols) * 100}%` as any;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.taskBlock,
          {
            top,
            height: isExpanded ? height + 40 : height,
            left: colLeft,
            width: colWidth,
            borderLeftColor: catColor,
            backgroundColor: swiping === "right"
              ? "#22C55E33"
              : swiping === "left"
              ? "#EF444433"
              : catColor + "22",
          },
          animStyle,
        ]}
      >
        {/* Swipe hint icon */}
        {swiping === "right" && (
          <View style={styles.swipeHint}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
          </View>
        )}

        {/* Drag time tooltip */}
        {isDragging && (
          <View style={[styles.dragTooltip, { backgroundColor: catColor }]}>
            <Ionicons name="time-outline" size={9} color="#FFF" />
            <Text style={styles.dragTooltipText}>{formatTime(dragTime)}</Text>
          </View>
        )}

        <View style={styles.taskBlockInner}>
          <Text style={[styles.taskBlockTitle, { color: colors.foreground }]} numberOfLines={isExpanded ? 3 : 1}>
            {task.title}
          </Text>
          <Text style={[styles.taskBlockMeta, { color: catColor }]}>
            {formatTime(isDragging ? dragTime : task.scheduledTime!)} · {task.estimatedMinutes}m
          </Text>
          {isExpanded && (
            <View style={styles.taskBlockActions}>
              <TouchableOpacity
                onPress={() => { onComplete(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                style={[styles.taskActionBtn, { backgroundColor: "#22C55E22", borderColor: "#22C55E44" }]}
              >
                <Ionicons name="checkmark" size={12} color="#22C55E" />
                <Text style={[styles.taskActionText, { color: "#22C55E" }]}>Done</Text>
              </TouchableOpacity>
              <View style={[styles.taskPriBadge, { backgroundColor: catColor + "33" }]}>
                <Text style={[styles.taskPriText, { color: catColor }]}>{task.categoryPrimary}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Long-press drag hint (bottom strip when not dragging) */}
        {!isDragging && height > 38 && (
          <View style={[styles.dragHandle, { backgroundColor: catColor + "55" }]}>
            <View style={[styles.dragHandleDots, { backgroundColor: catColor }]} />
            <View style={[styles.dragHandleDots, { backgroundColor: catColor }]} />
            <View style={[styles.dragHandleDots, { backgroundColor: catColor }]} />
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// Assign column positions to overlapping tasks
interface TaskColumn { task: Task; col: number; totalCols: number }
function layoutTasks(tasks: Task[]): TaskColumn[] {
  const sorted = [...tasks].sort((a, b) => (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? ""));
  const columns: { endMinute: number; tasks: Task[] }[] = [];

  const placed: TaskColumn[] = sorted.map((task) => {
    const startMin = timeToMinutes(task.scheduledTime ?? "00:00");
    const endMin = startMin + (task.estimatedMinutes ?? 30);
    let col = 0;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c].endMinute <= startMin) { col = c; columns[c].endMinute = endMin; columns[c].tasks.push(task); break; }
      col = columns.length;
    }
    if (col === columns.length) columns.push({ endMinute: endMin, tasks: [task] });
    return { task, col, totalCols: 1 };
  });

  // Fix totalCols: for each task, count how many tasks overlap it
  return placed.map((p) => {
    const startMin = timeToMinutes(p.task.scheduledTime ?? "00:00");
    const endMin = startMin + (p.task.estimatedMinutes ?? 30);
    const overlaps = placed.filter((q) => {
      const qs = timeToMinutes(q.task.scheduledTime ?? "00:00");
      const qe = qs + (q.task.estimatedMinutes ?? 30);
      return qs < endMin && qe > startMin;
    });
    return { ...p, totalCols: Math.max(1, overlaps.reduce((a, o) => Math.max(a, o.col + 1), 0)) };
  });
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, completeTask, addTask, updateTask, profile, dangerZone } = useApp();
  const [view, setView] = useState<CalView>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTaskSheet, setShowTaskSheet] = useState(false);
  const [prefillTime, setPrefillTime] = useState<string>();
  const [showAIChat, setShowAIChat] = useState(false);
  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: `Hey ${profile.firstName}! I can see your full schedule. Tell me what to plan or reschedule — I'll handle it instantly.` },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAILoading, setIsAILoading] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const timelineRef = useRef<ScrollView>(null);
  const chatScrollRef = useRef<ScrollView>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const dateStr = selectedDate.toISOString().split("T")[0];
  const isToday = dateStr === todayStr();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = minutesToTop(nowMinutes);

  // All tasks for the selected date
  const allDayTasks = tasks.filter((t) => t.scheduledDate === dateStr && !t.scheduledTime && !t.completed);
  const scheduledTasks = tasks.filter((t) => t.scheduledDate === dateStr && t.scheduledTime && !t.completed);
  const completedDayTasks = tasks.filter((t) => t.scheduledDate === dateStr && t.completed);
  const unscheduledTasks = tasks.filter((t) => !t.scheduledDate && !t.completed);

  // Auto-scroll to current time on day view
  useEffect(() => {
    if (view === "day" && isToday) {
      const target = Math.max(0, nowTop - 120);
      setTimeout(() => timelineRef.current?.scrollTo({ y: target, animated: true }), 300);
    }
  }, [view, isToday]);

  const navigate = (delta: number) => {
    const d = new Date(selectedDate);
    if (view === "day") d.setDate(d.getDate() + delta);
    else if (view === "week") d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setSelectedDate(d);
  };

  const getDayLabel = () => {
    if (view === "day") return isToday ? "Today" : selectedDate.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
    if (view === "month") return selectedDate.toLocaleDateString("en", { month: "long", year: "numeric" });
    const week = getWeekDays();
    return `${week[0].toLocaleDateString("en", { month: "short", day: "numeric" })} – ${week[6].toLocaleDateString("en", { month: "short", day: "numeric" })}`;
  };

  // ── Day View ──────────────────────────────────────────────────────────────
  const renderDayView = () => {
    const laid = layoutTasks(scheduledTasks);

    return (
      <ScrollView ref={timelineRef} showsVerticalScrollIndicator={false} scrollEnabled={!isDraggingAny} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* All-day / unscheduled for this day */}
        {allDayTasks.length > 0 && (
          <View style={[styles.allDayRow, { borderBottomColor: colors.border, backgroundColor: colors.card + "88" }]}>
            <Text style={[styles.allDayLabel, { color: colors.mutedForeground }]}>All Day</Text>
            <View style={styles.allDayTasks}>
              {allDayTasks.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => { Haptics.selectionAsync(); completeTask(t.id); }}
                  style={[styles.allDayChip, { backgroundColor: getCategoryColor(t.categoryPrimary, true) + "33", borderColor: getCategoryColor(t.categoryPrimary, true) + "88" }]}
                >
                  <View style={[styles.allDayDot, { backgroundColor: getCategoryColor(t.categoryPrimary, true) }]} />
                  <Text style={[styles.allDayChipText, { color: colors.foreground }]} numberOfLines={1}>{t.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={{ flexDirection: "row" }}>
          {/* Hour labels */}
          <View style={{ width: LABEL_WIDTH }}>
            {Array.from({ length: TOTAL_HOURS }, (_, i) => {
              const h = START_HOUR + i;
              const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
              return (
                <View key={h} style={[styles.hourLabelCell, { height: HOUR_HEIGHT }]}>
                  <Text style={[styles.hourLabelText, { color: colors.mutedForeground }]}>{label}</Text>
                </View>
              );
            })}
          </View>

          {/* Grid + tasks */}
          <View style={[styles.gridArea, { height: TIMELINE_HEIGHT }]}>
            {/* Hour lines */}
            {Array.from({ length: TOTAL_HOURS }, (_, i) => {
              const h = START_HOUR + i;
              const isDanger = dangerZone.dangerHours.includes(h);
              return (
                <TouchableOpacity
                  key={h}
                  activeOpacity={0.6}
                  onPress={() => {
                    const hStr = `${String(h).padStart(2, "0")}:00`;
                    setPrefillTime(hStr);
                    setShowTaskSheet(true);
                    Haptics.selectionAsync();
                  }}
                  style={[styles.hourGridCell, {
                    height: HOUR_HEIGHT,
                    top: i * HOUR_HEIGHT,
                    backgroundColor: isDanger ? "#EF444408" : "transparent",
                    borderTopColor: isDanger ? "#EF444420" : colors.border,
                  }]}
                >
                  {isDanger && (
                    <View style={styles.dangerBadge}>
                      <Ionicons name="flash" size={9} color="#EF4444" />
                      <Text style={styles.dangerBadgeText}>danger zone</Text>
                    </View>
                  )}
                  {/* Half-hour line */}
                  <View style={[styles.halfHourLine, { borderColor: colors.border + "60" }]} />
                </TouchableOpacity>
              );
            })}

            {/* Current time indicator */}
            {isToday && nowMinutes >= START_HOUR * 60 && nowMinutes < END_HOUR * 60 && (
              <View style={[styles.nowLine, { top: nowTop }]} pointerEvents="none">
                <View style={styles.nowDot} />
                <View style={[styles.nowLineBar, { backgroundColor: "#EF4444" }]} />
              </View>
            )}

            {/* Task blocks */}
            {laid.map(({ task, col, totalCols }) => (
              <DraggableTaskBlock
                key={task.id}
                task={task}
                col={col}
                totalCols={totalCols}
                isExpanded={expandedTask === task.id}
                colors={colors}
                onTap={() => {
                  Haptics.selectionAsync();
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setExpandedTask(expandedTask === task.id ? null : task.id);
                }}
                onComplete={() => completeTask(task.id)}
                onTimeChange={(newTime) => {
                  updateTask(task.id, { scheduledTime: newTime });
                }}
                onDragStart={() => setIsDraggingAny(true)}
                onDragEnd={() => setIsDraggingAny(false)}
              />
            ))}
          </View>
        </View>

        {/* Completed tasks */}
        {completedDayTasks.length > 0 && (
          <View style={[styles.completedSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.completedTitle, { color: colors.mutedForeground }]}>
              ✓ {completedDayTasks.length} completed
            </Text>
            {completedDayTasks.map((t) => (
              <View key={t.id} style={[styles.completedRow, { borderColor: colors.border }]}>
                <View style={[styles.completedDot, { backgroundColor: getCategoryColor(t.categoryPrimary, true) + "60" }]} />
                <Text style={[styles.completedText, { color: colors.mutedForeground }]}>{t.title}</Text>
                {t.scheduledTime && (
                  <Text style={[styles.completedTime, { color: colors.mutedForeground }]}>{formatTime(t.scheduledTime)}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Unscheduled tasks (no date at all) */}
        {unscheduledTasks.length > 0 && (
          <View style={[styles.completedSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.completedTitle, { color: colors.mutedForeground }]}>
              {unscheduledTasks.length} unscheduled
            </Text>
            {unscheduledTasks.slice(0, 5).map((t) => (
              <View key={t.id} style={[styles.completedRow, { borderColor: colors.border }]}>
                <View style={[styles.completedDot, { backgroundColor: getCategoryColor(t.categoryPrimary, true) }]} />
                <Text style={[styles.completedText, { color: colors.foreground }]}>{t.title}</Text>
                <TouchableOpacity
                  onPress={() => { updateTask(t.id, { scheduledDate: dateStr }); Haptics.selectionAsync(); }}
                  style={[styles.scheduleHereBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}
                >
                  <Text style={[styles.scheduleHereText, { color: colors.primary }]}>+ Today</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  // ── Week View ──────────────────────────────────────────────────────────────
  const getWeekDays = () => {
    const d = new Date(selectedDate);
    const offset = d.getDay() === 0 ? -6 : 1 - d.getDay();
    d.setDate(d.getDate() + offset);
    return Array.from({ length: 7 }, (_, i) => { const day = new Date(d); day.setDate(d.getDate() + i); return day; });
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const today = todayStr();
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Day header strip */}
        <View style={[styles.weekHeaderRow, { borderBottomColor: colors.border, backgroundColor: colors.card + "44" }]}>
          <View style={{ width: LABEL_WIDTH }} />
          {weekDays.map((day) => {
            const ds = day.toISOString().split("T")[0];
            const isT = ds === today;
            const isSel = ds === dateStr;
            const cnt = tasks.filter((t) => t.scheduledDate === ds && !t.completed).length;
            return (
              <TouchableOpacity
                key={ds}
                style={[styles.weekDayHeader, isSel && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
                onPress={() => { setSelectedDate(day); setView("day"); }}
              >
                <Text style={[styles.weekDayNameText, { color: isT ? colors.primary : colors.mutedForeground }]}>
                  {day.toLocaleDateString("en", { weekday: "short" })[0]}
                </Text>
                <View style={[styles.weekDayCircle, { backgroundColor: isT ? colors.primary : "transparent" }]}>
                  <Text style={[styles.weekDayNumText, { color: isT ? "#FFF" : colors.foreground }]}>{day.getDate()}</Text>
                </View>
                {cnt > 0 && (
                  <View style={[styles.weekCountBadge, { backgroundColor: colors.primary + "33" }]}>
                    <Text style={[styles.weekCountText, { color: colors.primary }]}>{cnt}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timeline grid */}
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: LABEL_WIDTH }}>
            {Array.from({ length: TOTAL_HOURS }, (_, i) => {
              const h = START_HOUR + i;
              const label = h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`;
              return (
                <View key={h} style={[styles.hourLabelCell, { height: HOUR_HEIGHT / 1.5 }]}>
                  <Text style={[styles.hourLabelText, { color: colors.mutedForeground, fontSize: 9 }]}>{label}</Text>
                </View>
              );
            })}
          </View>

          {weekDays.map((day) => {
            const ds = day.toISOString().split("T")[0];
            const dtasks = tasks.filter((t) => t.scheduledDate === ds && t.scheduledTime && !t.completed);
            const laid = layoutTasks(dtasks);
            const isT = ds === today;
            const WK_HOUR = HOUR_HEIGHT / 1.5;
            const WK_PX_PER_MIN = WK_HOUR / 60;

            return (
              <View key={ds} style={{ flex: 1, height: TOTAL_HOURS * WK_HOUR, position: "relative", borderLeftWidth: 1, borderLeftColor: colors.border + "40" }}>
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <View key={i} style={{ position: "absolute", top: i * WK_HOUR, left: 0, right: 0, height: WK_HOUR, borderTopWidth: 1, borderTopColor: colors.border + "40" }} />
                ))}

                {/* Current time */}
                {isT && nowMinutes >= START_HOUR * 60 && (
                  <View style={{ position: "absolute", top: (nowMinutes - START_HOUR * 60) * WK_PX_PER_MIN, left: 0, right: 0, height: 1.5, backgroundColor: "#EF4444", zIndex: 10 }} />
                )}

                {laid.map(({ task, col, totalCols }) => {
                  const startMin = timeToMinutes(task.scheduledTime ?? "00:00");
                  const top = (startMin - START_HOUR * 60) * WK_PX_PER_MIN;
                  const height = Math.max(18, task.estimatedMinutes * WK_PX_PER_MIN);
                  const catColor = getCategoryColor(task.categoryPrimary, true);
                  return (
                    <TouchableOpacity
                      key={task.id}
                      onPress={() => { setSelectedDate(day); setView("day"); }}
                      style={{
                        position: "absolute",
                        top,
                        height,
                        left: `${(col / totalCols) * 100}%` as any,
                        width: `${(1 / totalCols) * 100}%` as any,
                        backgroundColor: catColor + "33",
                        borderLeftWidth: 2,
                        borderLeftColor: catColor,
                        paddingHorizontal: 2,
                        paddingVertical: 1,
                        overflow: "hidden",
                      }}
                    >
                      <Text style={{ fontSize: 8, fontFamily: "Inter_600SemiBold", color: colors.foreground }} numberOfLines={1}>{task.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // ── Month View ──────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDayOfWeek = (() => {
      const d = new Date(year, month, 1).getDay();
      return d === 0 ? 6 : d - 1;
    })();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = todayStr();

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.monthGrid}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <Text key={d} style={[styles.monthDayHeader, { color: colors.mutedForeground }]}>{d}</Text>
          ))}
          {Array.from({ length: firstDayOfWeek }, (_, i) => <View key={`e${i}`} style={styles.monthCell} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const ds = new Date(year, month, day).toISOString().split("T")[0];
            const dt = tasks.filter((t) => t.scheduledDate === ds);
            const completedCount = dt.filter((t) => t.completed).length;
            const isT = ds === today;
            const isSel = ds === dateStr;

            return (
              <TouchableOpacity
                key={ds}
                style={[styles.monthCell, isSel && { backgroundColor: colors.primary + "18", borderRadius: 10 }]}
                onPress={() => { setSelectedDate(new Date(ds)); setView("day"); }}
              >
                <View style={[styles.monthDayCircle, { backgroundColor: isT ? colors.primary : "transparent" }]}>
                  <Text style={[styles.monthDayNum, { color: isT ? "#FFF" : colors.foreground, fontFamily: isSel ? "Inter_700Bold" : "Inter_400Regular" }]}>{day}</Text>
                </View>
                <View style={styles.monthDots}>
                  {dt.slice(0, 4).map((t, idx) => (
                    <View
                      key={t.id}
                      style={[styles.monthDot, {
                        backgroundColor: t.completed ? colors.mutedForeground + "60" : getCategoryColor(t.categoryPrimary, true),
                        opacity: t.completed ? 0.4 : 1,
                      }]}
                    />
                  ))}
                </View>
                {dt.length > 0 && (
                  <Text style={[styles.monthCount, { color: completedCount === dt.length ? "#22C55E" : colors.mutedForeground }]}>
                    {completedCount}/{dt.length}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day preview */}
        {tasks.filter((t) => t.scheduledDate === dateStr).length > 0 && (
          <View style={[styles.monthDayPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.monthPreviewTitle, { color: colors.foreground }]}>
              {selectedDate.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
            </Text>
            {tasks.filter((t) => t.scheduledDate === dateStr).sort((a, b) => (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? "")).map((t) => {
              const catColor = getCategoryColor(t.categoryPrimary, true);
              return (
                <View key={t.id} style={[styles.monthPreviewRow, { borderColor: colors.border }]}>
                  <View style={[styles.monthPreviewColor, { backgroundColor: catColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.monthPreviewTaskName, { color: t.completed ? colors.mutedForeground : colors.foreground, textDecorationLine: t.completed ? "line-through" : "none" }]}>{t.title}</Text>
                    {t.scheduledTime && (
                      <Text style={[styles.monthPreviewTime, { color: catColor }]}>{formatTime(t.scheduledTime)} · {t.estimatedMinutes}min</Text>
                    )}
                  </View>
                  {!t.completed && (
                    <TouchableOpacity onPress={() => { completeTask(t.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}>
                      <View style={[styles.monthCheckBtn, { borderColor: catColor + "88" }]}>
                        <Ionicons name="checkmark" size={12} color={catColor} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  // ── AI Chat ──────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || isAILoading) return;
    setChatInput("");
    setIsAILoading(true);
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text };
    setChatMessages((prev) => [...prev, userMsg]);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    const historyForAI = [...chatMessages, userMsg].map((m) => ({ role: m.role, content: m.text }));
    try {
      const result = await chatWithScheduler(historyForAI, {
        profile: { firstName: profile.firstName, chronotype: profile.chronotype, sleepStart: profile.sleepStart, sleepEnd: profile.sleepEnd, preferredWorkHours: profile.preferredWorkHours, primaryFocus: profile.primaryFocus, motivation: profile.motivation, mainStruggle: profile.mainStruggle, dailyCapacityMinutes: profile.dailyCapacityMinutes },
        tasks: tasks.map((t) => ({ id: t.id, title: t.title, scheduledDate: t.scheduledDate, scheduledTime: t.scheduledTime, deadline: t.deadline, priority: t.priority, categoryPrimary: t.categoryPrimary, completed: t.completed })),
      });
      setChatMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: result.text, action: result.action }]);
    } catch {
      setChatMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: "Sorry, couldn't connect. Try again!" }]);
    } finally {
      setIsAILoading(false);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const applyAction = async (msgId: string, action: SchedulerAction) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (action.type === "create_task" && action.task) {
      await addTask({ title: action.task.title, estimatedMinutes: action.task.estimatedMinutes ?? 30, priority: (action.task.priority ?? 2) as 1|2|3|4, difficulty: (action.task.difficulty ?? 2) as 1|2|3|4|5, categoryPrimary: action.task.categoryPrimary ?? "Personal", scheduledDate: action.task.scheduledDate, scheduledTime: action.task.scheduledTime, deadline: action.task.deadline, notes: action.task.notes, moodSensitive: false, isRecurring: false });
    } else if (action.type === "schedule_task" && action.taskId) {
      await updateTask(action.taskId, { scheduledDate: action.scheduledDate, scheduledTime: action.scheduledTime });
    }
    setChatMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, applied: true } : m));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={() => navigate(-1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="chevron-back" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSelectedDate(new Date()); setView("day"); }}>
              <Text style={[styles.dateLabel, { color: colors.foreground }]}>{getDayLabel()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate(1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerActions}>
            {view === "day" && (
              <View style={[styles.dayStatsBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.dayStatsText, { color: colors.primary }]}>
                  {scheduledTasks.length + allDayTasks.length} tasks
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setShowAIChat(true)}
              style={[styles.aiBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="sparkles" size={14} color="#FFF" />
              <Text style={styles.aiBtnText}>AI</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowTaskSheet(true); setPrefillTime(undefined); }}>
              <View style={[styles.addBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="add" size={20} color={colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* View switcher */}
        <View style={[styles.viewRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          {(["day", "week", "month"] as CalView[]).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => { setView(v); Haptics.selectionAsync(); }}
              style={[styles.viewBtn, view === v && { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 }]}
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

      {/* AI Chat Modal */}
      <Modal visible={showAIChat} transparent animationType="slide" onRequestClose={() => setShowAIChat(false)}>
        <View style={styles.aiModalContainer}>
          <Pressable style={styles.aiModalBackdrop} onPress={() => setShowAIChat(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.aiSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 8 }]}>
            <View style={[styles.aiHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.aiHeaderLeft}>
                <View style={[styles.aiHeaderIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons name="sparkles" size={16} color="#FFF" />
                </View>
                <View>
                  <Text style={[styles.aiHeaderTitle, { color: colors.foreground }]}>RAI Scheduler</Text>
                  <Text style={[styles.aiHeaderSub, { color: colors.mutedForeground }]}>AI with full access to your schedule</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowAIChat(false)}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView ref={chatScrollRef} style={styles.aiMessages} contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
              {chatMessages.map((msg) => (
                <View key={msg.id} style={[styles.msgRow, msg.role === "user" ? styles.msgRowUser : styles.msgRowAI]}>
                  {msg.role === "assistant" && (
                    <View style={[styles.msgAvatar, { backgroundColor: colors.primary }]}>
                      <Ionicons name="sparkles" size={12} color="#FFF" />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={[styles.msgBubble, msg.role === "user" ? [styles.msgBubbleUser, { backgroundColor: colors.primary }] : [styles.msgBubbleAI, { backgroundColor: colors.card, borderColor: colors.border }]]}>
                      <Text style={[styles.msgText, { color: msg.role === "user" ? "#FFF" : colors.foreground }]}>{msg.text}</Text>
                    </View>
                    {msg.action && msg.role === "assistant" && (
                      <TouchableOpacity onPress={() => !msg.applied && applyAction(msg.id, msg.action!)} style={[styles.applyBtn, { backgroundColor: msg.applied ? "#22C55E22" : colors.primary, borderColor: msg.applied ? "#22C55E44" : colors.primary }]} disabled={msg.applied}>
                        <Ionicons name={msg.applied ? "checkmark-circle" : "flash"} size={14} color={msg.applied ? "#22C55E" : "#FFF"} />
                        <Text style={[styles.applyBtnText, { color: msg.applied ? "#22C55E" : "#FFF" }]}>
                          {msg.applied ? "Applied!" : msg.action.type === "create_task" ? `Add "${msg.action.task?.title ?? "task"}"` : "Apply change"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              {isAILoading && (
                <View style={styles.msgRow}>
                  <View style={[styles.msgAvatar, { backgroundColor: colors.primary }]}><Ionicons name="sparkles" size={12} color="#FFF" /></View>
                  <View style={[styles.msgBubble, styles.msgBubbleAI, { backgroundColor: colors.card, borderColor: colors.border }]}><ActivityIndicator size="small" color={colors.primary} /></View>
                </View>
              )}
            </ScrollView>
            <View style={[styles.aiInputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.aiInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Schedule my gym, plan tomorrow..."
                placeholderTextColor={colors.mutedForeground}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                multiline
              />
              <TouchableOpacity onPress={sendMessage} style={[styles.sendBtn, { backgroundColor: chatInput.trim() ? colors.primary : colors.secondary }]} disabled={!chatInput.trim() || isAILoading}>
                <Ionicons name="send" size={18} color={chatInput.trim() ? "#FFF" : colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <TaskSheet
        visible={showTaskSheet}
        onClose={() => { setShowTaskSheet(false); setPrefillTime(undefined); }}
        prefillTime={prefillTime}
        prefillDate={dateStr}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, gap: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  navRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  dayStatsBadge: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  dayStatsText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  aiBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  aiBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" },
  addBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  viewRow: { flexDirection: "row", borderRadius: 10, padding: 3, borderWidth: 1, gap: 2 },
  viewBtn: { flex: 1, borderRadius: 8, paddingVertical: 6, alignItems: "center" },
  viewBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // All-day
  allDayRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  allDayLabel: { width: LABEL_WIDTH - 12, fontSize: 10, fontFamily: "Inter_500Medium", paddingTop: 4 },
  allDayTasks: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  allDayChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  allDayDot: { width: 6, height: 6, borderRadius: 3 },
  allDayChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  // Timeline
  hourLabelCell: { justifyContent: "flex-start", paddingTop: 4, alignItems: "flex-end", paddingRight: 8 },
  hourLabelText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  gridArea: { flex: 1, position: "relative" },
  hourGridCell: { position: "absolute", left: 0, right: 0, borderTopWidth: 1 },
  halfHourLine: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderStyle: "dashed" },
  dangerBadge: { flexDirection: "row", alignItems: "center", gap: 3, position: "absolute", top: 3, right: 6 },
  dangerBadgeText: { fontSize: 8, fontFamily: "Inter_500Medium", color: "#EF4444" },

  // Now line
  nowLine: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", zIndex: 20 },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444", marginLeft: -4 },
  nowLineBar: { flex: 1, height: 1.5 },

  // Task blocks
  taskBlock: {
    position: "absolute",
    borderLeftWidth: 3,
    borderRadius: 6,
    overflow: "hidden",
    padding: 4,
    zIndex: 5,
  },
  taskBlockInner: { flex: 1, gap: 2 },
  taskBlockTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", lineHeight: 14 },
  taskBlockMeta: { fontSize: 9, fontFamily: "Inter_500Medium" },
  taskBlockActions: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  taskActionBtn: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 3 },
  taskActionText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  taskPriBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  taskPriText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  dragTooltip: {
    position: "absolute",
    top: -22,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 200,
  },
  dragTooltipText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFF" },
  dragHandle: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  dragHandleDots: { width: 3, height: 3, borderRadius: 2 },
  swipeHint: {
    position: "absolute",
    right: 6,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 10,
  },

  // Completed & unscheduled sections
  completedSection: { borderTopWidth: 1, marginTop: 16, paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  completedTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  completedRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1 },
  completedDot: { width: 6, height: 6, borderRadius: 3 },
  completedText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", textDecorationLine: "line-through" },
  completedTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  scheduleHereBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  scheduleHereText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Week view
  weekHeaderRow: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 8 },
  weekDayHeader: { flex: 1, alignItems: "center", gap: 2, paddingBottom: 4 },
  weekDayNameText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  weekDayCircle: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  weekDayNumText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  weekCountBadge: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  weekCountText: { fontSize: 9, fontFamily: "Inter_700Bold" },

  // Month view
  monthGrid: { flexDirection: "row", flexWrap: "wrap", padding: 8, gap: 0 },
  monthDayHeader: { width: "14.28%", textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold", paddingVertical: 8 },
  monthCell: { width: "14.28%", alignItems: "center", paddingVertical: 6, gap: 3 },
  monthDayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  monthDayNum: { fontSize: 13 },
  monthDots: { flexDirection: "row", flexWrap: "wrap", gap: 2, justifyContent: "center", maxWidth: 32 },
  monthDot: { width: 5, height: 5, borderRadius: 3 },
  monthCount: { fontSize: 9, fontFamily: "Inter_500Medium" },
  monthDayPreview: { margin: 12, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  monthPreviewTitle: { fontSize: 14, fontFamily: "Inter_700Bold", padding: 14, paddingBottom: 8 },
  monthPreviewRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  monthPreviewColor: { width: 4, height: 36, borderRadius: 2 },
  monthPreviewTaskName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  monthPreviewTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  monthCheckBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },

  // AI modal
  aiModalContainer: { flex: 1, justifyContent: "flex-end" },
  aiModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#00000088" },
  aiSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%", minHeight: "60%" },
  aiHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  aiHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiHeaderIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  aiHeaderTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  aiHeaderSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aiMessages: { flex: 1 },
  msgRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  msgRowUser: { flexDirection: "row-reverse" },
  msgRowAI: {},
  msgAvatar: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  msgBubble: { borderRadius: 14, padding: 12, maxWidth: "85%", borderWidth: 1 },
  msgBubbleUser: { borderRadius: 14, borderTopRightRadius: 4, borderWidth: 0 },
  msgBubbleAI: { borderRadius: 14, borderTopLeftRadius: 4 },
  msgText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  applyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  applyBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  aiInputRow: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1 },
  aiInput: { flex: 1, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
