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
  hint: string | null;
  cta: string;
  skip: string;
}[] = [
  {
    id: "notifications",
    icon: "notifications",
    iconColor: "#6366F1",
    title: "Stay on track",
    why: "RAI sends you a morning briefing every day, reminds you 5 min before each task, and alerts you just before your danger zone starts.",
    hint: null,
    cta: "Enable Notifications",
    skip: "Skip",
  },
  {
    id: "usage",
    icon: "bar-chart",
    iconColor: "#F97316",
    title: "See your real screen time",
    why: "RAI reads your daily app usage from Android's Digital Wellbeing to show which apps eat your time, track your danger zone, and send smart alerts.",
    hint: Platform.OS === "android"
      ? "After tapping below, find RAI in the list that opens — then flip the toggle to allow."
      : null,
    cta: Platform.OS === "android" ? "Open Usage Access Settings" : "Continue",
    skip: "Skip — use default danger zone",
  },
  {
    id: "blocker",
    icon: "shield-checkmark",
    iconColor: "#EF4444",
    title: "Block distracting apps",
    why: "When you open a blocked app, RAI intercepts it with a mindful commitment prompt — giving you a 5-second pause instead of an hour of doom-scrolling.",
    hint: Platform.OS === "android"
      ? "After tapping below, find RAI in the Accessibility list and enable the service."
      : null,
    cta: Platform.OS === "android" ? "Open Accessibility Settings" : "Continue",
    skip: "Skip — no app blocking",
  },
];

export default function Permissions() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { updateProfile, dangerZone } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 20 : 44);
  const current = PERMISSIONS[currentIndex];

  const finish = async () => {
    await updateProfile({ permissionsRequested: true });
    router.replace("/(tabs)/home");
  };

  const advance = async () => {
    if (currentIndex < PERMISSIONS.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      await finish();
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
          if (firstDangerHour != null && firstDangerHour > 0) {
            await scheduleDangerZoneAlert(firstDangerHour);
          }
        } else {
          Alert.alert(
            "Notifications Blocked",
            "Enable later: Settings → Apps → RAI → Notifications.",
            [
              { text: "Open Settings", onPress: () => Linking.openSettings() },
              { text: "OK", style: "cancel" },
            ]
          );
        }

      } else if (current.id === "usage") {
        if (Platform.OS === "android") {
          // Opens Android Usage Access settings immediately.
          // Permission is granted by the user in system settings — we can't intercept it.
          // The AppState listener in analytics.tsx will detect the grant when they return.
          await UsageStats.requestPermission();
          await updateProfile({ usageStatsGranted: false }); // will be updated by AppState listener
        } else {
          await updateProfile({ usageStatsGranted: true });
        }

      } else if (current.id === "blocker") {
        if (Platform.OS === "android") {
          await AppBlocker.requestAccessibilityPermission();
          await updateProfile({ accessibilityGranted: false }); // updated by AppState
        }
      }
    } catch {}

    setIsLoading(false);
    await advance();
  };

  const handleSkip = async () => {
    await Haptics.selectionAsync();
    await advance();
  };

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A", "#130A28"]} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {/* Progress dots */}
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
          {/* Icon */}
          <View style={[styles.iconRing, { backgroundColor: current.iconColor + "1A", borderColor: current.iconColor + "33" }]}>
            <Ionicons name={current.icon} size={60} color={current.iconColor} />
          </View>

          {/* Text */}
          <View style={styles.textBlock}>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.why}>{current.why}</Text>
            {current.hint && (
              <View style={[styles.hintBox, { borderColor: current.iconColor + "44", backgroundColor: current.iconColor + "11" }]}>
                <Ionicons name="information-circle-outline" size={14} color={current.iconColor} />
                <Text style={[styles.hintText, { color: current.iconColor }]}>{current.hint}</Text>
              </View>
            )}
          </View>

          {/* Buttons */}
          <View style={styles.btns}>
            <TouchableOpacity
              onPress={handleGrant}
              disabled={isLoading}
              style={[styles.ctaBtn, { backgroundColor: current.iconColor, opacity: isLoading ? 0.7 : 1 }]}
            >
              <Ionicons name={isLoading ? "hourglass-outline" : "arrow-forward-circle-outline"} size={20} color="#FFF" />
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
  dot: { height: 4, borderRadius: 2, transition: "width 0.3s" as any },
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 36 },
  iconRing: { width: 128, height: 128, borderRadius: 64, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  textBlock: { alignItems: "center", gap: 12 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFF", textAlign: "center" },
  why: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#9CA3AF", textAlign: "center", lineHeight: 24 },
  hintBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 4 },
  hintText: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18, flex: 1 },
  btns: { width: "100%", gap: 12 },
  ctaBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 },
  ctaBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  skipBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  skipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#6B7280" },
  stepText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#374151", textAlign: "center", paddingBottom: 32 },
});
