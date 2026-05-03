import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { Theme } from "@/types";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getNotificationPermissionStatus, requestNotificationPermission, scheduleDailyBriefing, scheduleDangerZoneAlert } from "@/lib/notifications";

const THEMES: { value: Theme; label: string; icon: string }[] = [
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "light", label: "Light", icon: "sunny" },
  { value: "amoled", label: "AMOLED", icon: "contrast" },
  { value: "system", label: "System", icon: "phone-portrait" },
];

function SettingRow({ icon, iconColor, label, onPress, right, isDanger = false, subtitle }: {
  icon: string; iconColor?: string; label: string; onPress?: () => void; right?: React.ReactNode; isDanger?: boolean; subtitle?: string;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: isDanger ? "#EF444422" : (iconColor ? iconColor + "22" : colors.secondary) }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={isDanger ? "#EF4444" : (iconColor ?? colors.primary)} />
      </View>
      <View style={styles.settingLabelCol}>
        <Text style={[styles.settingLabel, { color: isDanger ? "#EF4444" : colors.foreground }]}>{label}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>}
      </View>
      <View style={styles.settingRight}>
        {right ?? (onPress && <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />)}
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>;
}

function StatusBadge({ status }: { status: "on" | "off" | "partial" }) {
  const color = status === "on" ? "#10B981" : status === "partial" ? "#F97316" : "#6B7280";
  const label = status === "on" ? "On" : status === "partial" ? "Partial" : "Off";
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + "22" }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, resetOnboarding, dangerZone, firebaseUserId } = useApp();
  const [notifStatus, setNotifStatus] = useState<"granted" | "denied" | "undetermined">("undetermined");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    getNotificationPermissionStatus().then(setNotifStatus);
  }, []);

  const handleEnableNotifications = async () => {
    await Haptics.selectionAsync();
    if (notifStatus === "denied") {
      Alert.alert(
        "Notifications Blocked",
        "Please go to Settings > Notifications > RAI to enable notifications.",
        [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }
    const granted = await requestNotificationPermission();
    if (granted) {
      await updateProfile({ notificationsGranted: true });
      await scheduleDailyBriefing(8, 0);
      const firstDanger = dangerZone.dangerHours[0];
      if (firstDanger && firstDanger > 0) await scheduleDangerZoneAlert(firstDanger);
      setNotifStatus("granted");
    }
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Reset All Data",
      "This will delete all your tasks, goals, diary entries, and progress. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: resetOnboarding },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          <SectionHeader title="APPEARANCE" />
          <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 8 }]}>
            <SettingRow
              icon="time-outline"
              iconColor="#6366F1"
              label="24-Hour Clock"
              subtitle={profile.use24Hour ? "Showing 14:30 format" : "Showing 2:30 PM format"}
              right={
                <Switch
                  value={!!profile.use24Hour}
                  onValueChange={(v) => { Haptics.selectionAsync(); updateProfile({ use24Hour: v }); }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFF"
                />
              }
            />
          </View>
          <View style={[styles.themeGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {THEMES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={async () => { await Haptics.selectionAsync(); updateProfile({ theme: t.value }); }}
                style={[styles.themeBtn, {
                  backgroundColor: profile.theme === t.value ? colors.primary : colors.secondary,
                  borderColor: profile.theme === t.value ? colors.primary : colors.border,
                }]}
              >
                <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={16} color={profile.theme === t.value ? "#FFF" : colors.mutedForeground} />
                <Text style={[styles.themeBtnText, { color: profile.theme === t.value ? "#FFF" : colors.mutedForeground }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <SectionHeader title="NOTIFICATIONS" />
          <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow
              icon="notifications"
              iconColor="#6366F1"
              label="Push Notifications"
              subtitle={notifStatus === "granted" ? "Task reminders & alerts active" : "Tap to enable"}
              onPress={notifStatus !== "granted" ? handleEnableNotifications : undefined}
              right={<StatusBadge status={notifStatus === "granted" ? "on" : notifStatus === "undetermined" ? "partial" : "off"} />}
            />
            <SettingRow
              icon="warning"
              iconColor="#EF4444"
              label="Danger Zone Alerts"
              subtitle={`Alerts before ${dangerZone.dangerHours[0]}:00 distraction window`}
              right={
                <Switch
                  value={profile.notificationsGranted && notifStatus === "granted"}
                  onValueChange={async (v) => { await Haptics.selectionAsync(); if (v) handleEnableNotifications(); }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFF"
                />
              }
            />
            <SettingRow
              icon="sunny"
              iconColor="#F59E0B"
              label="Morning Briefing"
              subtitle="Daily at 8:00 AM"
              right={
                <Switch
                  value={profile.notificationsGranted && notifStatus === "granted"}
                  onValueChange={async (v) => { await Haptics.selectionAsync(); if (v) scheduleDailyBriefing(8, 0); }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFF"
                />
              }
            />
          </View>

          <SectionHeader title="APP BLOCKER" />
          <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow
              icon="shield-checkmark"
              iconColor="#EF4444"
              label="Manage Blocked Apps"
              subtitle="Block distracting apps with commitment gates"
              onPress={() => router.push("/settings/app-blocker")}
            />
          </View>

          <SectionHeader title="PRODUCTIVITY" />
          <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon="time" iconColor="#6366F1" label="Default Focus Duration" right={<Text style={{ color: colors.mutedForeground, fontSize: 13 }}>25 min</Text>} />
            <SettingRow icon="bed" iconColor="#8B5CF6" label="Sleep Schedule" right={<Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{profile.sleepEnd} – {profile.sleepStart}</Text>} />
            <SettingRow icon="flash" iconColor="#F97316" label="Danger Zone Hours" right={<Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{dangerZone.dangerHours[0]}–{(dangerZone.dangerHours[dangerZone.dangerHours.length - 1] ?? 15) + 1}:00</Text>} />
          </View>

          <SectionHeader title="SYNC & ACCOUNT" />
          <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow
              icon="cloud"
              iconColor="#6366F1"
              label="Firebase Sync"
              subtitle={isFirebaseConfigured
                ? firebaseUserId ? `Connected · ${firebaseUserId.slice(0, 8)}...` : "Connecting..."
                : "Add credentials in Replit Secrets"}
              right={<StatusBadge status={isFirebaseConfigured && !!firebaseUserId ? "on" : isFirebaseConfigured ? "partial" : "off"} />}
            />
            <SettingRow icon="person" iconColor="#10B981" label="Edit Profile" onPress={() => router.push("/profile")} />
            <SettingRow icon="download" iconColor="#F59E0B" label="Export Data" onPress={() => Alert.alert("Coming soon", "Data export will be available in a future update.")} />
          </View>

          <SectionHeader title="DANGER ZONE" />
          <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon="refresh" label="Reset Onboarding" onPress={handleReset} isDanger />
            <SettingRow icon="trash" label="Delete All Data" onPress={handleReset} isDanger />
          </View>

          <Text style={[styles.version, { color: colors.mutedForeground }]}>RAI v2.0 · Powered by Groq · {isFirebaseConfigured ? "Firebase ✓" : "Local storage"}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 8 },
  sectionHeader: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginTop: 12, marginBottom: 4 },
  settingGroup: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  settingRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, gap: 12 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabelCol: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  settingRight: { alignItems: "center", justifyContent: "center" },
  themeGrid: { flexDirection: "row", gap: 8, borderRadius: 14, borderWidth: 1, padding: 10 },
  themeBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: "center", gap: 4 },
  themeBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  version: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 16 },
});
