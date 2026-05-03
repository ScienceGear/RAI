import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useApp } from "@/contexts/AppContext";
import { requestNotificationPermission, scheduleDailyBriefing, scheduleDangerZoneAlert } from "@/lib/notifications";
import { UsageStats } from "@/modules/usage-stats";

const PERMISSIONS = [
  {
    id: "notifications",
    icon: "notifications" as const,
    iconColor: "#6366F1",
    title: "Stay on track",
    why: "I'll remind you 15 min before each task, alert you when your danger zone starts, and send a morning briefing every day.",
    cta: "Enable Notifications",
    skip: "Skip — I'll miss reminders",
  },
  {
    id: "usage",
    icon: "bar-chart" as const,
    iconColor: "#F97316",
    title: "Find your danger zone",
    why: Platform.OS === "android"
      ? "To discover which hours drain your focus, I need access to your app usage patterns. Tap to open Android settings."
      : "RAI tracks your focus sessions and habit patterns to calculate your personal danger zone — no device screen time access needed.",
    cta: Platform.OS === "android" ? "Open Usage Settings" : "Got it",
    skip: "Skip — Use default danger zone",
  },
  {
    id: "microphone",
    icon: "mic" as const,
    iconColor: "#10B981",
    title: "Voice task input",
    why: "Add tasks in seconds by speaking. No typing needed — just say 'add gym tomorrow at 7am' and RAI handles the rest.",
    cta: "Allow Microphone",
    skip: "Skip — I'll type",
  },
];

export default function Permissions() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { updateProfile, dangerZone } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 20 : 44);
  const current = PERMISSIONS[currentIndex];

  const handleGrant = async () => {
    setIsLoading(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (current.id === "notifications") {
      const granted = await requestNotificationPermission();
      if (granted) {
        await updateProfile({ notificationsGranted: true });
        await scheduleDailyBriefing(8, 0);
        const firstDangerHour = dangerZone.dangerHours[0];
        if (firstDangerHour && firstDangerHour > 0) {
          await scheduleDangerZoneAlert(firstDangerHour);
        }
      } else {
        Alert.alert(
          "Notifications Blocked",
          "To enable notifications, go to your device Settings > Notifications > RAI and turn them on.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Later", style: "cancel" },
          ]
        );
        await updateProfile({ notificationsGranted: false });
      }
    } else if (current.id === "usage") {
      if (Platform.OS === "android" && UsageStats.isAvailable()) {
        await UsageStats.requestPermission();
        // Check if granted after returning from settings
        const granted = UsageStats.hasPermission();
        await updateProfile({ usageStatsGranted: granted });
        if (!granted) {
          Alert.alert(
            "Usage Access Needed",
            "Go to Usage Access in your device Settings and enable it for RAI to track your screen time.",
            [{ text: "OK" }]
          );
        }
      } else {
        await updateProfile({ usageStatsGranted: true });
      }
    } else if (current.id === "microphone") {
      await updateProfile({ microphoneGranted: true });
    }

    setIsLoading(false);
    advance();
  };

  const advance = () => {
    if (currentIndex < PERMISSIONS.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      router.replace("/(tabs)/home");
    }
  };

  const handleSkip = async () => {
    await Haptics.selectionAsync();
    advance();
  };

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A", "#130A28"]} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View style={[styles.progressRow, { paddingTop: topPad + 8 }]}>
          {PERMISSIONS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, {
                backgroundColor: i < currentIndex ? "#6366F1" : i === currentIndex ? "#8B5CF6" : "#1E1E2E",
                width: i === currentIndex ? 48 : 32,
              }]}
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
            <TouchableOpacity
              onPress={handleGrant}
              disabled={isLoading}
              style={[styles.ctaBtn, { backgroundColor: current.iconColor, opacity: isLoading ? 0.7 : 1 }]}
            >
              <Ionicons
                name={isLoading ? "hourglass-outline" : "checkmark-circle-outline"}
                size={20}
                color="#FFF"
              />
              <Text style={styles.ctaBtnText}>{isLoading ? "Requesting..." : current.cta}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>{current.skip}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.stepText}>{currentIndex + 1} of {PERMISSIONS.length}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: "row", gap: 8, justifyContent: "center", paddingTop: 16 },
  dot: { height: 4, borderRadius: 2 },
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 40 },
  iconContainer: { width: 130, height: 130, borderRadius: 65, alignItems: "center", justifyContent: "center" },
  textBlock: { alignItems: "center", gap: 12 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFF", textAlign: "center" },
  why: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#9CA3AF", textAlign: "center", lineHeight: 24 },
  btns: { width: "100%", gap: 12 },
  ctaBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 },
  ctaBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  skipBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  skipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#6B7280" },
  stepText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#4B5563", textAlign: "center", paddingBottom: 32 },
});
