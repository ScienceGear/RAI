import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { ProgressRing } from "@/components/ProgressRing";
import { generateConfidenceBoost } from "@/lib/ai";

export default function ConfidenceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, tasks, focusSessions } = useApp();
  const [affirmation, setAffirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalFocusMinutes = focusSessions.reduce((a, s) => a + s.completedMinutes, 0);
  const confidenceScore = Math.min(100, Math.round(
    profile.streak * 4 + completedTasks * 1.5 + Math.min(40, totalFocusMinutes / 10)
  ));

  useEffect(() => {
    if (affirmation) return;
    loadAffirmation();
  }, []);

  const loadAffirmation = async () => {
    setLoading(true);
    try {
      const boost = await generateConfidenceBoost({
        name: profile.firstName,
        streak: profile.streak,
        tasksCompleted: completedTasks,
        focusMinutes: totalFocusMinutes,
        motivation: profile.motivation,
      });
      setAffirmation(boost || `${profile.firstName}, you've completed ${completedTasks} tasks with a ${profile.streak}-day streak. Your consistency is building something real. Keep going.`);
    } finally {
      setLoading(false);
    }
  };

  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    const dayScore = Math.min(100, profile.streak * 4 + tasks.filter((t) => t.completed && t.completedAt?.startsWith(ds)).length * 10);
    return { day: d.toLocaleDateString("en", { weekday: "short" }).slice(0, 1), score: dayScore, key: ds };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Confidence</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#6366F111", "#8B5CF611", "#0A0A0F00"]} style={styles.hero}>
          <ProgressRing size={150} strokeWidth={12} progress={confidenceScore / 100} gradient trackColor={colors.border}>
            <View style={styles.scoreCenter}>
              <Text style={[styles.scoreNum, { color: colors.primary }]}>{confidenceScore}</Text>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Confidence</Text>
            </View>
          </ProgressRing>
        </LinearGradient>

        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>7-Day Trend</Text>
            <View style={styles.trendChart}>
              {weekData.map((d) => (
                <View key={d.key} style={styles.trendBar}>
                  <View style={[styles.trendBarTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.trendBarFill, {
                      height: `${d.score}%`,
                      backgroundColor: d.score > 50 ? colors.primary : colors.warning,
                    }]} />
                  </View>
                  <Text style={[styles.trendDayLabel, { color: colors.mutedForeground }]}>{d.day}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>RAI says</Text>
              <TouchableOpacity onPress={loadAffirmation} style={[styles.refreshBtn, { backgroundColor: colors.secondary }]}>
                <Ionicons name="refresh" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {loading ? (
              <Text style={[styles.affirmation, { color: colors.mutedForeground }]}>Generating your boost...</Text>
            ) : (
              <Text style={[styles.affirmation, { color: colors.foreground }]}>{affirmation}</Text>
            )}
          </View>

          <View style={styles.statsRow}>
            {[
              { label: "Tasks Done", value: completedTasks, icon: "checkmark-circle", color: colors.success },
              { label: "Focus Hours", value: `${Math.round(totalFocusMinutes / 60)}h`, icon: "time", color: colors.primary },
              { label: "Best Streak", value: `${profile.longestStreak}d`, icon: "flame", color: "#F97316" },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={22} color={s.color} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  hero: { alignItems: "center", paddingVertical: 40 },
  scoreCenter: { alignItems: "center" },
  scoreNum: { fontSize: 40, fontFamily: "Inter_700Bold" },
  scoreLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  content: { padding: 16, gap: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  refreshBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  affirmation: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 26 },
  trendChart: { flexDirection: "row", alignItems: "flex-end", height: 80, gap: 6 },
  trendBar: { flex: 1, alignItems: "center", gap: 6 },
  trendBarTrack: { flex: 1, width: "100%", borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  trendBarFill: { width: "100%", borderRadius: 4 },
  trendDayLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 16, alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});
