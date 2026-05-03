import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { Theme } from "@/types";

const THEMES: { value: Theme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "amoled", label: "AMOLED" },
  { value: "system", label: "System" },
];

function SettingRow({ icon, label, onPress, right, isDanger = false }: {
  icon: string; label: string; onPress?: () => void; right?: React.ReactNode; isDanger?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: isDanger ? "#EF444422" : colors.secondary }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={isDanger ? "#EF4444" : colors.primary} />
      </View>
      <Text style={[styles.settingLabel, { color: isDanger ? "#EF4444" : colors.foreground }]}>{label}</Text>
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

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, resetOnboarding } = useApp();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleReset = () => {
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
          <View style={[styles.themeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {THEMES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => updateProfile({ theme: t.value })}
                style={[styles.themeBtn, {
                  backgroundColor: profile.theme === t.value ? colors.primary : colors.secondary,
                  borderColor: profile.theme === t.value ? colors.primary : colors.border,
                }]}
              >
                <Text style={[styles.themeBtnText, { color: profile.theme === t.value ? "#FFF" : colors.mutedForeground }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <SectionHeader title="NOTIFICATIONS" />
          <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon="warning" label="Danger Zone Alerts" right={
              <Switch value={profile.notificationsGranted} onValueChange={(v) => updateProfile({ notificationsGranted: v })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
            } />
            <SettingRow icon="alarm" label="Task Reminders" right={
              <Switch value={profile.notificationsGranted} onValueChange={(v) => updateProfile({ notificationsGranted: v })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
            } />
            <SettingRow icon="sunny" label="Morning Briefing" right={
              <Switch value={profile.notificationsGranted} onValueChange={(v) => updateProfile({ notificationsGranted: v })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
            } />
            <SettingRow icon="happy" label="Mood Check-ins" right={
              <Switch value={false} onValueChange={() => {}} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
            } />
          </View>

          <SectionHeader title="PRODUCTIVITY" />
          <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon="time" label="Default Focus Duration" right={<Text style={{ color: colors.mutedForeground, fontSize: 13 }}>25 min</Text>} onPress={() => {}} />
            <SettingRow icon="bed" label="Sleep Schedule" right={<Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{profile.sleepEnd} – {profile.sleepStart}</Text>} onPress={() => {}} />
            <SettingRow icon="flash" label="Danger Zone Hours" right={<Text style={{ color: colors.mutedForeground, fontSize: 13 }}>2–4 PM</Text>} onPress={() => {}} />
          </View>

          <SectionHeader title="ACCOUNT" />
          <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon="person" label="Edit Profile" onPress={() => router.push("/profile")} />
            <SettingRow icon="cloud-download" label="Export Data" onPress={() => {}} />
            <SettingRow icon="key" label="Firebase Status" right={
              <View style={[styles.statusDot, { backgroundColor: "#10B981" }]} />
            } />
          </View>

          <SectionHeader title="DANGER ZONE" />
          <View style={[styles.settingGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon="refresh" label="Reset Onboarding" onPress={handleReset} isDanger />
            <SettingRow icon="trash" label="Delete All Data" onPress={handleReset} isDanger />
          </View>

          <Text style={[styles.version, { color: colors.mutedForeground }]}>RAI v2.0 · Built with love</Text>
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
  settingLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  settingRight: { alignItems: "center", justifyContent: "center" },
  themeRow: { flexDirection: "row", gap: 8, borderRadius: 14, borderWidth: 1, padding: 10 },
  themeBtn: { flex: 1, borderRadius: 8, borderWidth: 1, paddingVertical: 8, alignItems: "center" },
  themeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  version: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 16 },
});
