import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { calculateRiskScore } from "@/src/services/RiskEngine";
import { router } from "expo-router";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();
  const { authUserId, dangerZone, tasks, moodLogs, profile } = useApp();

  const tabBarHeight = isWeb ? 84 : 60 + insets.bottom;

  useEffect(() => {
    if (!authUserId || !profile.permissionsComplete || !profile.usageAccessGranted) return;

    const checkRisk = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const pendingTasks = tasks.filter((task) => task.scheduledDate === today && !task.completed).length;
        const mood = moodLogs[0]?.mood ?? null;
        const result = await calculateRiskScore({
          userId: authUserId,
          pendingTasks,
          idleMinutes: 0,
          mood,
          currentHour: new Date().getHours(),
          dangerHours: dangerZone.dangerHours,
        });
        if (result.level === "critical") {
          router.replace("/lockscreen");
        }
      } catch {}
    };

    void checkRisk();
    const interval = setInterval(() => {
      void checkRisk();
    }, 60_000);
    return () => clearInterval(interval);
  }, [authUserId, dangerZone.dangerHours, tasks, moodLogs, profile.permissionsComplete, profile.usageAccessGranted]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: isWeb ? 10 : insets.bottom,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ),
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color }) => <Feather name="check-square" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => <Feather name="calendar" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: "Squad",
          tabBarIcon: ({ color }) => <Feather name="users" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
    </Tabs>
  );
}
