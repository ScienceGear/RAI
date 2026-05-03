import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useApp } from "@/contexts/AppContext";

const PERMISSIONS = [
  {
    id: "notifications",
    icon: "notifications" as const,
    iconColor: "#6366F1",
    title: "Stay on track",
    why: "I'll remind you before you drift — not after.",
    cta: "Enable Notifications",
    skip: "Skip — I'll miss reminders",
  },
  {
    id: "usage",
    icon: "bar-chart" as const,
    iconColor: "#F97316",
    title: "Find your danger zone",
    why: "To discover which hours pull you away, I need to see your app usage patterns.",
    cta: "Enable Usage Access",
    skip: "Skip — No danger zone alerts",
  },
  {
    id: "microphone",
    icon: "mic" as const,
    iconColor: "#10B981",
    title: "Voice task input",
    why: "Add tasks in seconds by speaking. No typing needed.",
    cta: "Allow Microphone",
    skip: "Skip — I'll type",
  },
];

export default function Permissions() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { updateProfile } = useApp();

  const current = PERMISSIONS[currentIndex];

  const handleGrant = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (current.id === "notifications") {
      await updateProfile({ notificationsGranted: true });
    } else if (current.id === "usage") {
      await updateProfile({ usageStatsGranted: true });
    } else if (current.id === "microphone") {
      await updateProfile({ microphoneGranted: true });
    }
    advance();
  };

  const advance = () => {
    if (currentIndex < PERMISSIONS.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      router.replace("/(tabs)/home");
    }
  };

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A", "#130A28"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.progressRow}>
          {PERMISSIONS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i <= currentIndex ? "#6366F1" : "#1E1E2E" }]}
            />
          ))}
        </View>

        <View style={styles.container}>
          <View style={[styles.iconContainer, { backgroundColor: current.iconColor + "22" }]}>
            <Ionicons name={current.icon} size={64} color={current.iconColor} />
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.why}>{current.why}</Text>
          </View>

          <View style={styles.btns}>
            <TouchableOpacity onPress={handleGrant} style={[styles.ctaBtn, { backgroundColor: "#6366F1" }]}>
              <Text style={styles.ctaBtnText}>{current.cta}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={advance} style={styles.skipBtn}>
              <Text style={styles.skipText}>{current.skip}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: "row", gap: 8, justifyContent: "center", paddingTop: 16 },
  dot: { width: 32, height: 4, borderRadius: 2 },
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 40 },
  iconContainer: { width: 130, height: 130, borderRadius: 65, alignItems: "center", justifyContent: "center" },
  textBlock: { alignItems: "center", gap: 12 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFF", textAlign: "center" },
  why: { fontSize: 16, fontFamily: "Inter_400Regular", color: "#9CA3AF", textAlign: "center", lineHeight: 24 },
  btns: { width: "100%", gap: 12 },
  ctaBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  ctaBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  skipBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  skipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#6B7280" },
});
