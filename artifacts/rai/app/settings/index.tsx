import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
  Alert, Platform, Linking, Modal, Share, TextInput, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { Theme } from "@/types";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  getNotificationPermissionStatus, requestNotificationPermission,
  scheduleDailyBriefing, scheduleDangerZoneAlert, cancelAllNotificationsOfType,
} from "@/lib/notifications";

const THEMES: { value: Theme; label: string; icon: string }[] = [
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "light", label: "Light", icon: "sunny" },
  { value: "amoled", label: "AMOLED", icon: "contrast" },
  { value: "system", label: "System", icon: "phone-portrait" },
];

const FOCUS_PRESETS = [15, 20, 25, 30, 45, 60, 90];

// ── Shared sub-components ───────────────────────────────────────────────────

function SettingRow({ icon, iconColor, label, onPress, right, isDanger = false, subtitle, last = false }: {
  icon: string; iconColor?: string; label: string; onPress?: () => void;
  right?: React.ReactNode; isDanger?: boolean; subtitle?: string; last?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.settingRow, { borderBottomColor: last ? "transparent" : colors.border }]}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: isDanger ? "#EF444422" : iconColor ? iconColor + "22" : colors.secondary }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={isDanger ? "#EF4444" : (iconColor ?? colors.primary)} />
      </View>
      <View style={styles.settingLabelCol}>
        <Text style={[styles.settingLabel, { color: isDanger ? "#EF4444" : colors.foreground }]}>{label}</Text>
        {subtitle ? <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
      <View style={styles.settingRight}>
        {right !== undefined ? right : onPress ? <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} /> : null}
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

function ValueBadge({ value, color = "#6366F1" }: { value: string; color?: string }) {
  return (
    <View style={[styles.valueBadge, { backgroundColor: color + "22", borderColor: color + "44" }]}>
      <Text style={[styles.valueBadgeText, { color }]}>{value}</Text>
    </View>
  );
}

function Stepper({ value, label, onDecrement, onIncrement }: {
  value: string; label?: string; onDecrement: () => void; onIncrement: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={onDecrement} style={[styles.stepperBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
        <Ionicons name="remove" size={14} color={colors.foreground} />
      </TouchableOpacity>
      <Text style={[styles.stepperVal, { color: colors.foreground }]}>{label ?? value}</Text>
      <TouchableOpacity onPress={onIncrement} style={[styles.stepperBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
        <Ionicons name="add" size={14} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );
}

// ── Focus Duration Modal ────────────────────────────────────────────────────
function FocusDurationModal({ visible, current, onSelect, onClose }: {
  visible: boolean; current: number; onSelect: (m: number) => void; onClose: () => void;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Default Focus Duration</Text>
        <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>Pre-fills the timer when you start a new focus session</Text>
        <View style={styles.focusGrid}>
          {FOCUS_PRESETS.map((m) => {
            const active = current === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => { Haptics.selectionAsync(); onSelect(m); onClose(); }}
                style={[styles.focusChip, {
                  backgroundColor: active ? colors.primary : colors.secondary,
                  borderColor: active ? colors.primary : colors.border,
                }]}
              >
                <Text style={[styles.focusChipNum, { color: active ? "#FFF" : colors.foreground }]}>{m}</Text>
                <Text style={[styles.focusChipUnit, { color: active ? "#FFFFFF99" : colors.mutedForeground }]}>min</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

// ── Sleep Schedule Modal ────────────────────────────────────────────────────
function SleepModal({ visible, wakeUp, bedtime, onSave, onClose }: {
  visible: boolean; wakeUp: string; bedtime: string;
  onSave: (wakeUp: string, bedtime: string) => void; onClose: () => void;
}) {
  const colors = useColors();
  const [wake, setWake] = useState(wakeUp);
  const [bed, setBed] = useState(bedtime);

  useEffect(() => {
    if (visible) { setWake(wakeUp); setBed(bedtime); }
  }, [visible, wakeUp, bedtime]);

  const valid = (t: string) => /^\d{2}:\d{2}$/.test(t);

  const handleSave = () => {
    if (!valid(wake) || !valid(bed)) {
      Alert.alert("Invalid Format", "Please use HH:MM format (e.g. 07:00, 23:30).");
      return;
    }
    onSave(wake, bed);
    onClose();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Sleep Schedule</Text>
        <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
          RAI avoids scheduling tasks during sleep and protects your wind-down time before bed.
        </Text>

        <View style={styles.sleepRow}>
          <View style={styles.sleepField}>
            <View style={[styles.sleepIcon, { backgroundColor: "#F59E0B22" }]}>
              <Ionicons name="sunny" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.sleepFieldLabel, { color: colors.mutedForeground }]}>Wake up</Text>
            <TextInput
              style={[styles.sleepInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={wake}
              onChangeText={setWake}
              keyboardType="numbers-and-punctuation"
              placeholder="07:00"
              placeholderTextColor={colors.mutedForeground}
              maxLength={5}
            />
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.mutedForeground} style={{ marginTop: 32 }} />
          <View style={styles.sleepField}>
            <View style={[styles.sleepIcon, { backgroundColor: "#8B5CF622" }]}>
              <Ionicons name="moon" size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.sleepFieldLabel, { color: colors.mutedForeground }]}>Bedtime</Text>
            <TextInput
              style={[styles.sleepInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={bed}
              onChangeText={setBed}
              keyboardType="numbers-and-punctuation"
              placeholder="23:00"
              placeholderTextColor={colors.mutedForeground}
              maxLength={5}
            />
          </View>
        </View>

        <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.saveBtnText}>Save Schedule</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Main Settings Screen ────────────────────────────────────────────────────
export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    profile, updateProfile, resetOnboarding, dangerZone, firebaseUserId,
    tasks, goals, diary, moodLogs, focusSessions, achievements,
  } = useApp();

  const [notifStatus, setNotifStatus] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => { getNotificationPermissionStatus().then(setNotifStatus); }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const notifOn = notifStatus === "granted" && !!profile.notificationsGranted;
  const focusMins = profile.defaultFocusDuration ?? 25;
  const briefingHour = profile.morningBriefingHour ?? 8;
  const briefingLabel = briefingHour === 0 ? "12:00 AM" : briefingHour < 12 ? `${briefingHour}:00 AM` : briefingHour === 12 ? "12:00 PM" : `${briefingHour - 12}:00 PM`;
  const dangerFirst = dangerZone.dangerHours[0] ?? 14;
  const dangerLast = (dangerZone.dangerHours[dangerZone.dangerHours.length - 1] ?? 15) + 1;
  const capacityHours = Math.round((profile.dailyCapacityMinutes ?? 480) / 60);

  // ── Notification handlers ─────────────────────────────────────────────────
  const handleEnableNotifications = async () => {
    await Haptics.selectionAsync();
    if (notifStatus === "denied") {
      Alert.alert(
        "Notifications Blocked",
        "Go to Settings → Notifications → RAI to enable.",
        [{ text: "Open Settings", onPress: () => Linking.openSettings() }, { text: "Cancel", style: "cancel" }]
      );
      return;
    }
    const granted = await requestNotificationPermission();
    if (granted) {
      await updateProfile({ notificationsGranted: true, morningBriefingEnabled: true, dangerZoneAlertsEnabled: true });
      await scheduleDailyBriefing(briefingHour, 0);
      if (dangerFirst) await scheduleDangerZoneAlert(dangerFirst);
      setNotifStatus("granted");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const toggleMorningBriefing = async (on: boolean) => {
    if (!notifOn) { handleEnableNotifications(); return; }
    await Haptics.selectionAsync();
    await updateProfile({ morningBriefingEnabled: on });
    if (on) await scheduleDailyBriefing(briefingHour, 0);
    else await cancelAllNotificationsOfType("daily_briefing");
  };

  const toggleDangerZoneAlerts = async (on: boolean) => {
    if (!notifOn) { handleEnableNotifications(); return; }
    await Haptics.selectionAsync();
    await updateProfile({ dangerZoneAlertsEnabled: on });
    if (on) { if (dangerFirst) await scheduleDangerZoneAlert(dangerFirst); }
    else { for (const h of dangerZone.dangerHours) await cancelAllNotificationsOfType(`danger_zone_${h}`); }
  };

  const adjustBriefingHour = async (delta: number) => {
    if (!notifOn || !profile.morningBriefingEnabled) return;
    const newHour = Math.max(5, Math.min(11, briefingHour + delta));
    await updateProfile({ morningBriefingHour: newHour });
    await scheduleDailyBriefing(newHour, 0);
    Haptics.selectionAsync();
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        appVersion: "2.0",
        profile: {
          name: profile.name, email: profile.email,
          streak: profile.streak, xp: profile.xp,
          level: profile.level, raiScore: profile.raiScore,
          chronotype: profile.chronotype, primaryFocus: profile.primaryFocus,
        },
        stats: {
          tasksCompleted: tasks.filter((t) => t.completed).length,
          totalTasks: tasks.length,
          totalFocusMinutes: focusSessions.reduce((s, f) => s + (f.completedMinutes ?? 0), 0),
          diaryEntries: diary.length,
          goalsCount: goals.length,
        },
        tasks: tasks.map((t) => ({
          title: t.title, priority: t.priority, categoryPrimary: t.categoryPrimary,
          scheduledDate: t.scheduledDate, scheduledTime: t.scheduledTime,
          estimatedMinutes: t.estimatedMinutes, completed: t.completed,
        })),
        goals: goals.map((g) => ({ title: g.title, targetDate: g.targetDate, progress: g.progress })),
        diary: diary.map((d) => ({ date: d.date, content: d.content, mood: d.mood })),
        moodLogs: moodLogs.map((m) => ({ date: m.date, mood: m.mood, tags: m.tags })),
        focusSessions: focusSessions.map((f) => ({
          startTime: f.startTime, durationMinutes: f.durationMinutes, completedMinutes: f.completedMinutes,
        })),
        achievements: achievements.filter((a) => a.unlockedAt).map((a) => ({
          id: a.id, title: a.title, unlockedAt: a.unlockedAt,
        })),
      };
      const json = JSON.stringify(payload, null, 2);
      await Share.share({ message: json, title: "RAI Data Export" });
    } catch {
      Alert.alert("Export Failed", "Could not export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Danger zone actions ───────────────────────────────────────────────────
  const handleResetOnboarding = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Reset Onboarding",
      "This restarts the setup flow and resets your profile preferences. Your tasks and goals are kept.",
      [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: resetOnboarding }]
    );
  };

  const handleDeleteAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete All Data",
      "This permanently deletes ALL tasks, goals, diary, progress, and profile data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything", style: "destructive",
          onPress: async () => { await resetOnboarding(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
        },
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

          {/* ── APPEARANCE ── */}
          <SectionHeader title="APPEARANCE" />
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow
              icon="time-outline" iconColor="#6366F1" label="24-Hour Clock"
              subtitle={profile.use24Hour ? "Showing 14:30 format" : "Showing 2:30 PM format"}
              right={
                <Switch value={!!profile.use24Hour}
                  onValueChange={(v) => { Haptics.selectionAsync(); updateProfile({ use24Hour: v }); }}
                  trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF"
                />
              }
              last
            />
          </View>
          <View style={[styles.themeGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {THEMES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => { Haptics.selectionAsync(); updateProfile({ theme: t.value }); }}
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

          {/* ── NOTIFICATIONS ── */}
          <SectionHeader title="NOTIFICATIONS" />
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow
              icon="notifications" iconColor="#6366F1" label="Push Notifications"
              subtitle={notifOn ? "Active — reminders & alerts enabled" : notifStatus === "denied" ? "Blocked — tap to open Settings" : "Tap to enable"}
              onPress={!notifOn ? handleEnableNotifications : undefined}
              right={<StatusBadge status={notifOn ? "on" : notifStatus === "undetermined" ? "partial" : "off"} />}
            />
            <SettingRow
              icon="warning" iconColor="#EF4444" label="Danger Zone Alerts"
              subtitle={notifOn && profile.dangerZoneAlertsEnabled
                ? `Alerts at ${dangerFirst}:00 before your distraction window`
                : notifOn ? "Off — tap switch to enable" : "Enable push notifications first"}
              right={
                <Switch
                  value={notifOn && !!profile.dangerZoneAlertsEnabled}
                  onValueChange={toggleDangerZoneAlerts}
                  trackColor={{ false: colors.border, true: "#EF4444" }} thumbColor="#FFF"
                />
              }
            />
            <SettingRow
              icon="sunny" iconColor="#F59E0B" label="Morning Briefing"
              subtitle={notifOn && profile.morningBriefingEnabled
                ? `Daily at ${briefingLabel} — tap ±  to adjust`
                : notifOn ? "Off — tap switch to enable" : "Enable push notifications first"}
              right={
                notifOn && profile.morningBriefingEnabled ? (
                  <Stepper
                    value={briefingLabel}
                    onDecrement={() => adjustBriefingHour(-1)}
                    onIncrement={() => adjustBriefingHour(1)}
                  />
                ) : (
                  <Switch
                    value={notifOn && !!profile.morningBriefingEnabled}
                    onValueChange={toggleMorningBriefing}
                    trackColor={{ false: colors.border, true: "#F59E0B" }} thumbColor="#FFF"
                  />
                )
              }
              last
            />
          </View>

          {/* ── APP BLOCKER ── */}
          <SectionHeader title="APP BLOCKER" />
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow
              icon="shield-checkmark" iconColor="#EF4444"
              label="Manage Blocked Apps"
              subtitle={`Block distracting apps with a commitment gate`}
              onPress={() => router.push("/settings/app-blocker")}
              last
            />
          </View>

          {/* ── PRODUCTIVITY ── */}
          <SectionHeader title="PRODUCTIVITY" />
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow
              icon="timer" iconColor="#6366F1"
              label="Default Focus Duration"
              subtitle="Pre-fills the timer when starting a session"
              onPress={() => { Haptics.selectionAsync(); setShowFocusModal(true); }}
              right={<ValueBadge value={`${focusMins} min`} />}
            />
            <SettingRow
              icon="bed" iconColor="#8B5CF6"
              label="Sleep Schedule"
              subtitle={`Wake ${profile.sleepEnd ?? "07:00"}  ·  Bed ${profile.sleepStart ?? "23:00"}`}
              onPress={() => { Haptics.selectionAsync(); setShowSleepModal(true); }}
            />
            <SettingRow
              icon="battery-half" iconColor="#10B981"
              label="Daily Work Capacity"
              subtitle="Hours RAI can schedule tasks per day"
              right={
                <Stepper
                  value={`${capacityHours}h`}
                  onDecrement={() => { updateProfile({ dailyCapacityMinutes: Math.max(60, (profile.dailyCapacityMinutes ?? 480) - 60) }); Haptics.selectionAsync(); }}
                  onIncrement={() => { updateProfile({ dailyCapacityMinutes: Math.min(960, (profile.dailyCapacityMinutes ?? 480) + 60) }); Haptics.selectionAsync(); }}
                />
              }
            />
            <SettingRow
              icon="flash" iconColor="#F97316"
              label="Danger Zone"
              subtitle={`${dangerFirst}:00–${dangerLast}:00 · ${dangerZone.isBootstrapEstimate ? "Default estimate" : `Learned from ${dangerZone.dataPointsCount} usage points`}`}
              right={<ValueBadge value={`${dangerZone.dangerHours.length}h`} color="#F97316" />}
              last
            />
          </View>

          {/* ── SYNC & ACCOUNT ── */}
          <SectionHeader title="SYNC & ACCOUNT" />
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow
              icon="cloud" iconColor="#6366F1"
              label="Firebase Sync"
              subtitle={isFirebaseConfigured
                ? firebaseUserId ? `Connected · UID ${firebaseUserId.slice(0, 8)}…` : "Connecting…"
                : "Add Firebase credentials in Replit Secrets"}
              right={<StatusBadge status={isFirebaseConfigured && !!firebaseUserId ? "on" : isFirebaseConfigured ? "partial" : "off"} />}
            />
            <SettingRow
              icon="person" iconColor="#10B981"
              label="Edit Profile"
              subtitle={`${profile.name} · Level ${profile.level} · ${profile.xp} XP`}
              onPress={() => router.push("/profile")}
            />
            <SettingRow
              icon="download" iconColor="#F59E0B"
              label="Export My Data"
              subtitle={`${tasks.length} tasks · ${diary.length} diary entries · ${focusSessions.length} sessions`}
              onPress={isExporting ? undefined : handleExport}
              right={isExporting ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
              last
            />
          </View>

          {/* ── DANGER ZONE ── */}
          <SectionHeader title="DANGER ZONE" />
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow
              icon="refresh" isDanger
              label="Reset Onboarding"
              subtitle="Restart the setup flow — your tasks & goals are kept"
              onPress={handleResetOnboarding}
            />
            <SettingRow
              icon="trash" isDanger
              label="Delete All Data"
              subtitle="Permanently removes everything — cannot be undone"
              onPress={handleDeleteAll}
              last
            />
          </View>

          <Text style={[styles.version, { color: colors.mutedForeground }]}>
            RAI v2.0  ·  {tasks.filter((t) => t.completed).length} tasks done  ·  {profile.streak} day streak
            {"\n"}{isFirebaseConfigured ? "☁️  Firebase synced" : "💾  Local storage only"}
          </Text>
        </View>
      </ScrollView>

      <FocusDurationModal
        visible={showFocusModal}
        current={focusMins}
        onSelect={(m) => updateProfile({ defaultFocusDuration: m })}
        onClose={() => setShowFocusModal(false)}
      />
      <SleepModal
        visible={showSleepModal}
        wakeUp={profile.sleepEnd ?? "07:00"}
        bedtime={profile.sleepStart ?? "23:00"}
        onSave={(w, b) => updateProfile({ sleepEnd: w, sleepStart: b })}
        onClose={() => setShowSleepModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 8 },

  sectionHeader: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginTop: 12, marginBottom: 4 },

  group: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingRow: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, gap: 12 },
  settingIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  settingLabelCol: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  settingRight: { alignItems: "center", justifyContent: "center" },

  themeGrid: { flexDirection: "row", gap: 8, borderRadius: 16, borderWidth: 1, padding: 10 },
  themeBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: "center", gap: 4 },
  themeBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  valueBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  valueBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepperBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepperVal: { fontSize: 13, fontFamily: "Inter_600SemiBold", minWidth: 48, textAlign: "center" },

  // Modals
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 6 },
  sheetSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 24 },

  focusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  focusChip: { width: "30%", borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: "center", gap: 2 },
  focusChipNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  focusChipUnit: { fontSize: 11, fontFamily: "Inter_500Medium" },

  sleepRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginBottom: 24 },
  sleepField: { flex: 1, alignItems: "center", gap: 6 },
  sleepIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sleepFieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sleepInput: { width: "100%", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },

  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },

  version: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 20, lineHeight: 19 },
});
