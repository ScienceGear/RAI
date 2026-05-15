import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { ProgressRing } from "@/components/ProgressRing";
import { xpToNextLevel, getLevelTitle } from "@/lib/xp";
import { Achievement } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  consistency: "Consistency",
  focus: "Focus",
  speed: "Speed",
  social: "Social",
  milestones: "Milestones",
  recovery: "Recovery",
  scheduling: "Scheduling",
};

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const colors = useColors();
  const isUnlocked = achievement.unlocked;

  return (
    <View style={[styles.achieveCard, {
      backgroundColor: colors.card,
      borderColor: isUnlocked ? colors.primary + "55" : colors.border,
      opacity: isUnlocked ? 1 : 0.65,
    }]}>
      <View style={[styles.iconWrap, {
        backgroundColor: isUnlocked ? colors.primary + "22" : colors.secondary,
      }]}>
        <Ionicons
          name={achievement.icon as keyof typeof Ionicons.glyphMap}
          size={24}
          color={isUnlocked ? colors.primary : colors.mutedForeground}
        />
        {!isUnlocked && (
          <View style={[styles.lockOverlay, { backgroundColor: colors.background + "CC" }]}>
            <Ionicons name="lock-closed" size={12} color={colors.mutedForeground} />
          </View>
        )}
      </View>
      <View style={styles.achieveInfo}>
        <Text style={[styles.achieveName, { color: colors.foreground }]}>{achievement.name}</Text>
        <Text style={[styles.achieveDesc, { color: colors.mutedForeground }]}>{achievement.description}</Text>
        {achievement.progress !== undefined && achievement.target && !achievement.unlocked && (
          <View style={styles.achieveProgress}>
            <View style={[styles.achieveProgressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.achieveProgressFill, {
                width: `${Math.min(100, (achievement.progress / achievement.target) * 100)}%`,
                backgroundColor: colors.primary,
              }]} />
            </View>
            <Text style={[styles.achieveProgressText, { color: colors.mutedForeground }]}>
              {achievement.progress}/{achievement.target}
            </Text>
          </View>
        )}
      </View>
      <View style={[styles.xpBadge, { backgroundColor: isUnlocked ? "#F59E0B22" : colors.secondary }]}>
        <Text style={[styles.xpText, { color: isUnlocked ? "#F59E0B" : colors.mutedForeground }]}>
          +{achievement.xpReward}
        </Text>
      </View>
    </View>
  );
}

export default function AchievementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, achievements } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const xpInfo = xpToNextLevel(profile.xp);
  const levelTitle = getLevelTitle(profile.level);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const categories = [...new Set(achievements.map((a) => a.category))];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Achievements</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={[1]}
        renderItem={() => (
          <View style={styles.content}>
            <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ProgressRing size={80} strokeWidth={8} progress={xpInfo.progress} gradient trackColor={colors.border}>
                <Text style={[styles.levelNum, { color: colors.primary }]}>{profile.level}</Text>
              </ProgressRing>
              <View style={styles.levelInfo}>
                <Text style={[styles.levelTitle, { color: colors.foreground }]}>Level {profile.level} · {levelTitle}</Text>
                <Text style={[styles.levelXP, { color: colors.mutedForeground }]}>
                  {profile.xp} XP total · {xpInfo.current}/{xpInfo.needed} to next level
                </Text>
                <View style={[styles.xpProgressBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.xpProgressFill, { width: `${xpInfo.progress * 100}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.unlockLabel, { color: colors.mutedForeground }]}>
                  {unlockedCount}/{achievements.length} achievements unlocked
                </Text>
              </View>
            </View>

            {categories.map((cat) => {
              const catAchs = achievements.filter((a) => a.category === cat);
              return (
                <View key={cat} style={styles.categorySection}>
                  <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </Text>
                  {catAchs.map((ach) => <AchievementCard key={ach.id} achievement={ach} />)}
                </View>
              );
            })}
          </View>
        )}
        keyExtractor={() => "content"}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 20 },
  levelCard: { flexDirection: "row", gap: 16, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center" },
  levelNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  levelInfo: { flex: 1, gap: 4 },
  levelTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  levelXP: { fontSize: 12, fontFamily: "Inter_400Regular" },
  xpProgressBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  xpProgressFill: { height: "100%", borderRadius: 2 },
  unlockLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  categorySection: { gap: 8 },
  categoryTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  achieveCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 12, gap: 12, marginBottom: 8 },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", position: "relative" },
  lockOverlay: { position: "absolute", inset: 0, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  achieveInfo: { flex: 1, gap: 2 },
  achieveName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  achieveDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  achieveProgress: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  achieveProgressBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  achieveProgressFill: { height: "100%", borderRadius: 2 },
  achieveProgressText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  xpBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  xpText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
