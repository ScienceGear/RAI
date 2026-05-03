import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useApp } from "@/contexts/AppContext";
import { requestNotificationPermission, scheduleDailyBriefing, scheduleDangerZoneAlert } from "@/lib/notifications";
import { UsageStats } from "@/modules/usage-stats";
import { AppBlocker } from "@/modules/app-blocker";

type PermId = "notifications" | "usage" | "blocker";

const PERMISSIONS: {
  id: PermId;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  title: string;
  why: string;
  cta: string;
  skip: string;
}[] = [
  {
    id: "notifications",
    icon: "notifications",
    iconColor: "#6366F1",
    title: "Stay on track",
    why: "I'll remind you 15 min before each task, alert you before your danger zone starts, and send a morning briefing every day.",
    cta: "Enable Notifications",
    skip: "Skip — I'll miss reminders",
  },
  {
    id: "usage",
    icon: "bar-chart",
    iconColor: "#F97316",
    title: "See your screen time",
    why: Platform.OS === "android"
      ? "RAI reads your daily app usage to show exactly which apps eat your time and when your focus drops. Tap to open Android Settings — find RAI and enable it."
      : "RAI tracks your focus sessions and habit patterns to calculate your personal danger zone.",
    cta: Platform.OS === "android" ? "Open Usage Access Settings" : "Got it",
    skip: "Skip — Use default danger zone",
  },
  {
    id: "blocker",
    icon: "shield-checkmark",
    iconColor: "#EF4444",
    title: "Block distracting apps",
    why: "When you open a blocked app, RAI intercepts it and asks for a voice or text commitment — giving you a 5-minute mindful break instead of doom-scrolling.",
    cta: Platform.OS === "android" ? "Open Accessibility Settings" : "Got it",
    skip: "Skip — No app blocking",
  },
];

export default function Permissions() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { updateProfile, dangerZone } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 20 : 44);
  const current = PERMISSIONS[currentIndex];

  const advance = () => {
    if (currentIndex < PERMISSIONS.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      router.replace("/(tabs)/home");
    }
  };

  const handleGrant = async () => {
    setIsLoading(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      if (current.id === "notifications") {
        const granted = await requestNotificationPermission();
        await updateProfile({ notificationsGranted: granted });
        if (granted) {
          await scheduleDailyBriefing(8, 0);
          const firstDangerHour = dangerZone.dangerHours[0];
          if (firstDangerHour && firstDangerHour > 0) {
            await scheduleDangerZoneAlert(firstDangerHour);
          }
        } else {
          Alert.alert(
            "Notifications Blocked",
            "To enable later: Settings → Notifications → RAI → turn on.",
            [
              { text: "Open Settings", onPress: () => Linking.openSettings() },
              { text: "OK", style: "cancel" },
            ]
          );
        }

      } else if (current.id === "usage") {
        if (Platform.OS === "android") {
          // Opens Usage Access settings. Resolves immediately — user needs to
          // navigate to RAI and toggle. AppState listener in analytics.tsx
          // picks up the grant when they return to the app.
          await UsageStats.requestPermission();
          // Mark as pending — will be updated when the user returns
          await updateProfile({ usageStatsGranted: false });
        } else {
          await updateProfile({ usageStatsGranted: true });
        }

      } else if (current.id === "blocker") {
        if (Platform.OS === "android") {
          // Opens Accessibility Settings. Same pattern as usage.
          await AppBlocker.requestAccessibilityPermission();
          await updateProfile({ accessibilityGranted: false });
        }
      }
    } catch {}

    setIsLoading(false);
    advance();
  };

  const handleSkip = async () => {
    await Haptics.selectionAsync();
    advance();
  };

  const getHint = (): string | null => {
    if (current.id === "usage" && Platform.OS === "android") {
      return "In the list that opens, find RAI and tap the toggle.";
    }
    if (current.id === "blocker" && Platform.OS === "android") {
      return "In the list that opens, tap RAI and enable the service.";
    }
    return null;
  };

  const hint = getHint();

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
            {hint && (
              <View style={[styles.hintBox, { borderColor: current.iconColor + "44", backgroundColor: current.iconColor + "11" }]}>
                <Ionicons name="information-circle-outline" size={14} color={current.iconColor} />
                <Text style={[styles.hintText, { color: current.iconColor }]}>{hint}</Text>
              </View>
            )}
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
              <Text style={styles.ctaBtnText}>{isLoading ? "Opening…" : current.cta}</Text>
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
  hintBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 4,
  },
  hintText: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18, flex: 1 },
  btns: { width: "100%", gap: 12 },
  ctaBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 },
  ctaBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  skipBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  skipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#6B7280" },
  stepText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#4B5563", textAlign: "center", paddingBottom: 32 },
});
