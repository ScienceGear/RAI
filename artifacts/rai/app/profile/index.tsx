import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { ProgressRing } from "@/components/ProgressRing";
import { xpToNextLevel, getLevelTitle } from "@/lib/xp";
import { getRaiScoreTier, getCategoryColor } from "@/constants/categories";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, tasks, focusSessions, achievements } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const xpInfo = xpToNextLevel(profile.xp);
  const levelTitle = getLevelTitle(profile.level);
  const scoreTier = getRaiScoreTier(profile.raiScore);
  const completedTasks = tasks.filter((t) => t.completed);
  const totalFocusHours = Math.round(focusSessions.reduce((a, s) => a + s.completedMinutes, 0) / 60);
  const unlockedAchievements = achievements.filter((a) => a.unlocked).length;

  const categoryBreakdown = completedTasks.reduce((acc, task) => {
    acc[task.categoryPrimary] = (acc[task.categoryPrimary] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <TouchableOpacity onPress={() => router.push("/settings")}>
          <Ionicons name="settings-outline" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.avatarLarge, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarLargeText}>{profile.firstName[0]?.toUpperCase()}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.foreground }]}>{profile.name}</Text>
          <Text style={[styles.userTier, { color: colors.accent }]}>{scoreTier.title}</Text>
          <View style={styles.streakRow}>
            <Ionicons name="flame" size={16} color="#F97316" />
            <Text style={[styles.streakText, { color: colors.foreground }]}>{profile.streak}-day streak</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ProgressRing size={80} strokeWidth={7} progress={xpInfo.progress} gradient trackColor={colors.border}>
              <Text style={[styles.levelNum, { color: colors.primary }]}>{profile.level}</Text>
            </ProgressRing>
            <View style={styles.levelInfo}>
              <Text style={[styles.levelTitle, { color: colors.foreground }]}>Level {profile.level} · {levelTitle}</Text>
              <Text style={[styles.levelXP, { color: colors.mutedForeground }]}>{profile.xp} total XP</Text>
              <View style={[styles.xpBar, { backgroundColor: colors.border }]}>
                <View style={[styles.xpFill, { width: `${xpInfo.progress * 100}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>
                {xpInfo.current}/{xpInfo.needed} XP to next level
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            {[
              { label: "Tasks Done", value: completedTasks.length, icon: "checkmark-circle", color: colors.success },
              { label: "Focus Hours", value: `${totalFocusHours}h`, icon: "time", color: colors.primary },
              { label: "Best Streak", value: `${profile.longestStreak}d`, icon: "flame", color: "#F97316" },
              { label: "Achievements", value: unlockedAchievements, icon: "trophy", color: "#F59E0B" },
              { label: "RAI Score", value: profile.raiScore, icon: "star", color: colors.accent },
              { label: "Sessions", value: focusSessions.length, icon: "timer", color: colors.teal },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={20} color={s.color} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {Object.keys(categoryBreakdown).length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Category Breakdown</Text>
              {Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, count]) => (
                <View key={cat} style={styles.catRow}>
                  <View style={[styles.catDot, { backgroundColor: getCategoryColor(cat, true) }]} />
                  <Text style={[styles.catName, { color: colors.foreground }]}>{cat}</Text>
                  <Text style={[styles.catCount, { color: colors.mutedForeground }]}>{count} tasks</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.quickLinks}>
            {[
              { label: "Achievements", icon: "trophy", onPress: () => router.push("/achievements") },
              { label: "Goals", icon: "flag", onPress: () => router.push("/goals") },
              { label: "Confidence Builder", icon: "sparkles", onPress: () => router.push("/confidence") },
              { label: "Diary", icon: "journal", onPress: () => router.push("/diary") },
              { label: "Settings", icon: "settings", onPress: () => router.push("/settings") },
            ].map((link) => (
              <TouchableOpacity
                key={link.label}
                onPress={link.onPress}
                style={[styles.quickLink, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Ionicons name={link.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
                <Text style={[styles.quickLinkText, { color: colors.foreground }]}>{link.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
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
  heroSection: { alignItems: "center", paddingVertical: 32, gap: 8, borderBottomWidth: 1 },
  avatarLarge: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  avatarLargeText: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#FFF" },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold" },
  userTier: { fontSize: 15, fontFamily: "Inter_500Medium" },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 14 },
  levelCard: { flexDirection: "row", gap: 16, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center" },
  levelNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  levelInfo: { flex: 1, gap: 4 },
  levelTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  levelXP: { fontSize: 12, fontFamily: "Inter_400Regular" },
  xpBar: { height: 4, borderRadius: 2, overflow: "hidden", marginVertical: 2 },
  xpFill: { height: "100%", borderRadius: 2 },
  xpLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "30%", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4, flexGrow: 1 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  catRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  catCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  quickLinks: { gap: 8 },
  quickLink: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  quickLinkText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
});
