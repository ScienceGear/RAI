import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

export default function AntiQuitScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, tasks, focusSessions } = useApp();

  const completedTasks = tasks.filter((t) => t.completed).length;
  const focusHours = Math.round(focusSessions.reduce((a, s) => a + s.completedMinutes, 0) / 60);

  const milestones = [
    { label: "Tasks completed", value: completedTasks, icon: "checkmark-circle", color: "#10B981" },
    { label: "Hours focused", value: `${focusHours}h`, icon: "time", color: "#6366F1" },
    { label: "Day streak record", value: `${profile.longestStreak}d`, icon: "flame", color: "#F97316" },
    { label: "XP earned", value: profile.xp, icon: "star", color: "#F59E0B" },
  ];

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A", "#130A28"]} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.emojiHeader}>
            <Ionicons name="heart" size={56} color="#EF4444" />
          </View>

          <Text style={styles.title}>Hey {profile.firstName},</Text>
          <Text style={styles.subtitle}>RAI misses you. Look how far you've come.</Text>

          <View style={[styles.statsCard, { backgroundColor: "#12121C", borderColor: "#1E1E2E" }]}>
            {milestones.map((m) => (
              <View key={m.label} style={styles.milestone}>
                <View style={[styles.milestoneIcon, { backgroundColor: m.color + "22" }]}>
                  <Ionicons name={m.icon as keyof typeof Ionicons.glyphMap} size={22} color={m.color} />
                </View>
                <View>
                  <Text style={styles.milestoneValue}>{m.value}</Text>
                  <Text style={styles.milestoneLabel}>{m.label}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.aiMessage}>
            Quitting now means losing the progress you've built. But if you're struggling, that's okay — let's restart gently with just 2 tasks a day.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/home")}
              style={[styles.primaryBtn, { backgroundColor: "#6366F1" }]}
            >
              <Ionicons name="flash" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>Comeback Mode — Start Fresh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/diary")}
              style={[styles.secondaryBtn, { backgroundColor: "#12121C", borderColor: "#1E1E2E" }]}
            >
              <Ionicons name="journal" size={18} color="#818CF8" />
              <Text style={[styles.secondaryBtnText, { color: "#818CF8" }]}>Talk to RAI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/home")}
              style={styles.skipBtn}
            >
              <Text style={styles.skipBtnText}>Go back to dashboard</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 28, paddingBottom: 60, gap: 24, alignItems: "center" },
  emojiHeader: { marginTop: 16 },
  title: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#FFF", textAlign: "center" },
  subtitle: { fontSize: 16, fontFamily: "Inter_400Regular", color: "#9CA3AF", textAlign: "center", marginTop: -12 },
  statsCard: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 20, gap: 16 },
  milestone: { flexDirection: "row", alignItems: "center", gap: 14 },
  milestoneIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  milestoneValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFF" },
  milestoneLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280" },
  aiMessage: { fontSize: 16, fontFamily: "Inter_400Regular", color: "#D1D5DB", textAlign: "center", lineHeight: 26 },
  actions: { width: "100%", gap: 12 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 16 },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 14, borderWidth: 1 },
  secondaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  skipBtn: { alignItems: "center", paddingVertical: 10 },
  skipBtnText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#6B7280" },
});
