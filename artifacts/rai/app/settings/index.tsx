import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
  Alert, Platform, Linking,
} from "react-native";
import { SwipeableSheet } from "@/components/SwipeableSheet";
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

// ── Debounce hook ────────────────────────────────────────────────────────────
function useDebounced<T extends (...args: any[]) => any>(fn: T, delay = 400) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const fnRef = useRef(fn);
  fnRef.current = fn;
  return (...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), delay);
  };
}

function useThrottled<T extends (...args: any[]) => any>(fn: T, interval = 300) {
  const last = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last.current >= interval) {
      last.current = now;
      fnRef.current(...args);
    }
  };
}

// ── Shared sub-components ────────────────────────────────────────────────────

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

function Stepper({ value, onDecrement, onIncrement }: {
  value: string; onDecrement: () => void; onIncrement: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={onDecrement} style={[styles.stepperBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
        <Ionicons name="remove" size={14} color={colors.foreground} />
      </TouchableOpacity>
      <Text style={[styles.stepperVal, { color: colors.foreground }]}>{value}</Text>
      <TouchableOpacity onPress={onIncrement} style={[styles.stepperBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
        <Ionicons name="add" size={14} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );
}

// ── Focus Duration Modal ─────────────────────────────────────────────────────
function FocusDurationModal({ visible, current, onSelect, onClose }: {
  visible: boolean; current: number; onSelect: (m: number) => void; onClose: () => void;
}) {
  const colors = useColors();
  return (
    <SwipeableSheet visible={visible} onClose={onClose} backgroundColor={colors.card} handleColor={colors.border}>
      <View style={styles.sheetInner}>
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
    </SwipeableSheet>
  );
}

// ── Time Spinner ─────────────────────────────────────────────────────────────
function TimeSpinner({
  label, iconName, iconColor, value, onChange, use12Hour,
}: {
  label: string; iconName: string; iconColor: string;
  value: string; onChange: (v: string) => void; use12Hour: boolean;
}) {
  const colors = useColors();

  const parseTime = (t: string) => {
    const [hStr, mStr] = t.split(":");
    const h = parseInt(hStr ?? "0", 10) || 0;
    const m = parseInt(mStr ?? "0", 10) || 0;
    return { h: Math.max(0, Math.min(23, h)), m: Math.max(0, Math.min(59, m)) };
  };

  const { h, m } = parseTime(value);

  const emit = (newH: number, newM: number) => {
    const hh = (((newH % 24) + 24) % 24);
    const mm = (((newM % 60) + 60) % 60);
    onChange(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
    Haptics.selectionAsync();
  };

  const displayH = use12Hour ? (h % 12 === 0 ? 12 : h % 12) : h;
  const ampm = h < 12 ? "AM" : "PM";

  return (
    <View style={styles.timeSpinner}>
      <View style={[styles.timeSpinnerIcon, { backgroundColor: iconColor + "22" }]}>
        <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={18} color={iconColor} />
      </View>
      <Text style={[styles.timeSpinnerLabel, { color: colors.mutedForeground }]}>{label}</Text>

      <View style={styles.timeSpinnerRow}>
        {/* Hours */}
        <View style={styles.timeUnit}>
          <TouchableOpacity onPress={() => emit(h + 1, m)} style={styles.timeArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-up" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={[styles.timeValueBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.timeValue, { color: colors.foreground }]}>{String(displayH).padStart(2, "0")}</Text>
          </View>
          <TouchableOpacity onPress={() => emit(h - 1, m)} style={styles.timeArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.timeColon, { color: colors.foreground }]}>:</Text>

        {/* Minutes */}
        <View style={styles.timeUnit}>
          <TouchableOpacity onPress={() => emit(h, m + 5)} style={styles.timeArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-up" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={[styles.timeValueBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.timeValue, { color: colors.foreground }]}>{String(m).padStart(2, "0")}</Text>
          </View>
          <TouchableOpacity onPress={() => emit(h, m - 5)} style={styles.timeArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {use12Hour && (
          <TouchableOpacity
            onPress={() => emit(h < 12 ? h + 12 : h - 12, m)}
            style={[styles.ampmBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          >
            <Text style={[styles.ampmText, { color: colors.primary }]}>{ampm}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Sleep Schedule Modal ─────────────────────────────────────────────────────
function SleepModal({ visible, wakeUp, bedtime, use12Hour, onSave, onClose }: {
  visible: boolean; wakeUp: string; bedtime: string; use12Hour: boolean;
  onSave: (wakeUp: string, bedtime: string) => void; onClose: () => void;
}) {
  const colors = useColors();
  const [wake, setWake] = useState(wakeUp);
  const [bed, setBed] = useState(bedtime);

  useEffect(() => {
    if (visible) { setWake(wakeUp); setBed(bedtime); }
  }, [visible, wakeUp, bedtime]);

  const handleSave = () => {
    onSave(wake, bed);
    onClose();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SwipeableSheet visible={visible} onClose={onClose} backgroundColor={colors.card} handleColor={colors.border}>
      <View style={styles.sheetInner}>
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Sleep Schedule</Text>
        <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
          RAI avoids scheduling tasks during sleep and protects your wind-down time before bed.
        </Text>

        <View style={styles.timeSpinnersRow}>
          <TimeSpinner
            label="Wake up" iconName="sunny" iconColor="#F59E0B"
            value={wake} onChange={setWake} use12Hour={use12Hour}
          />
          <View style={[styles.timeSpinnerDivider, { backgroundColor: colors.border }]} />
          <TimeSpinner
            label="Bedtime" iconName="moon" iconColor="#8B5CF6"
            value={bed} onChange={setBed} use12Hour={use12Hour}
          />
        </View>

        <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.saveBtnText}>Save Schedule</Text>
        </TouchableOpacity>
      </View>
    </SwipeableSheet>
  );
}

// ── Main Settings Screen ─────────────────────────────────────────────────────
export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    profile, updateProfile, resetOnboarding, dangerZone, firebaseUserId,
    tasks,
  } = useApp();

  const [notifStatus, setNotifStatus] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => { getNotificationPermissionStatus().then(setNotifStatus); }, []);

  // ── Derived values ──────────────────────────────────────────────────────────
  const notifOn = notifStatus === "granted" && !!profile.notificationsGranted;
  const focusMins = profile.defaultFocusDuration ?? 25;
  const briefingHour = profile.morningBriefingHour ?? 8;
  const briefingLabel = briefingHour === 0 ? "12:00 AM" : briefingHour < 12 ? `${briefingHour}:00 AM` : briefingHour === 12 ? "12:00 PM" : `${briefingHour - 12}:00 PM`;
  const dangerFirst = dangerZone.dangerHours[0] ?? 14;
  const dangerLast = (dangerZone.dangerHours[dangerZone.dangerHours.length - 1] ?? 15) + 1;
  const capacityHours = Math.round((profile.dailyCapacityMinutes ?? 480) / 60);

  // ── Debounced/throttled handlers ────────────────────────────────────────────
  const handleEnableNotifications = useDebounced(async () => {
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
  }, 600);

  const toggleMorningBriefing = useDebounced(async (on: boolean) => {
    if (!notifOn) { handleEnableNotifications(); return; }
    await Haptics.selectionAsync();
    await updateProfile({ morningBriefingEnabled: on });
    if (on) await scheduleDailyBriefing(briefingHour, 0);
    else await cancelAllNotificationsOfType("daily_briefing");
  }, 500);

  const toggleDangerZoneAlerts = useDebounced(async (on: boolean) => {
    if (!notifOn) { handleEnableNotifications(); return; }
    await Haptics.selectionAsync();
    await updateProfile({ dangerZoneAlertsEnabled: on });
    if (on) { if (dangerFirst) await scheduleDangerZoneAlert(dangerFirst); }
    else { for (const h of dangerZone.dangerHours) await cancelAllNotificationsOfType(`danger_zone_${h}`); }
  }, 500);

  const adjustBriefingHour = useThrottled(async (delta: number) => {
    if (!notifOn || !profile.morningBriefingEnabled) return;
    const newHour = Math.max(5, Math.min(11, briefingHour + delta));
    await updateProfile({ morningBriefingHour: newHour });
    await scheduleDailyBriefing(newHour, 0);
    Haptics.selectionAsync();
  }, 250);

  const adjustCapacity = useThrottled((delta: number) => {
    updateProfile({ dailyCapacityMinutes: Math.max(60, Math.min(960, (profile.dailyCapacityMinutes ?? 480) + delta)) });
    Haptics.selectionAsync();
  }, 200);

  const handleResetOnboarding = useDebounced(() => {
    Alert.alert(
      "Reset Onboarding",
      "This will restart the setup flow. Your tasks and goals will be kept.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: async () => { await resetOnboarding(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
      ]
    );
  }, 600);

  const handleDeleteAll = useDebounced(() => {
    Alert.alert(
      "Delete All Data",
      "This permanently removes all your tasks, goals, diary entries, and profile data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything", style: "destructive",
          onPress: async () => { await resetOnboarding(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
        },
      ]
    );
  }, 600);

  const openWebsite = useDebounced(() => {
    Linking.openURL("https://rai.sciencegear.tech").catch(() =>
      Alert.alert("Could not open", "Visit rai.sciencegear.tech in your browser.")
    );
  }, 600);

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
              icon="warning" iconColor="#F97316" label="Danger Zone Alerts"
              subtitle="Get warned when your high-risk hours begin"
              right={
                <Switch value={!!profile.dangerZoneAlertsEnabled}
                  onValueChange={toggleDangerZoneAlerts}
                  trackColor={{ false: colors.border, true: "#F97316" }} thumbColor="#FFF"
                />
              }
            />
            <SettingRow
              icon="sunny" iconColor="#F59E0B" label="Morning Briefing"
              subtitle={profile.morningBriefingEnabled ? `Daily at ${briefingLabel}` : "Off"}
              right={
                <Switch value={!!profile.morningBriefingEnabled}
                  onValueChange={toggleMorningBriefing}
                  trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF"
                />
              }
            />
            {profile.morningBriefingEnabled && notifOn && (
              <SettingRow
                icon="alarm" iconColor="#6366F1" label="Briefing Time"
                subtitle="When RAI wakes you up with your plan"
                right={
                  <Stepper
                    value={briefingLabel}
                    onDecrement={() => adjustBriefingHour(-1)}
                    onIncrement={() => adjustBriefingHour(1)}
                  />
                }
                last
              />
            )}
            {(!profile.morningBriefingEnabled || !notifOn) && <View />}
          </View>

          {/* ── APP BLOCKER ── */}
          <SectionHeader title="APP BLOCKER" />
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow
              icon="shield-checkmark" iconColor="#EF4444"
              label="Manage Blocked Apps"
              subtitle="Block distracting apps with a commitment gate"
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
                  onDecrement={() => adjustCapacity(-60)}
                  onIncrement={() => adjustCapacity(60)}
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
              subtitle={`${profile.name}${profile.age ? ` · Age ${profile.age}` : ""} · Level ${profile.level}`}
              onPress={() => router.push("/profile")}
            />
            <SettingRow
              icon="globe" iconColor="#0EA5E9"
              label="Visit Website"
              subtitle="rai.sciencegear.tech"
              onPress={openWebsite}
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

          <Text style={[styles.copyright, { color: colors.mutedForeground }]}>
            Made by ScienceGear © 2026
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
        use12Hour={!profile.use24Hour}
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
  sheetInner: { padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 6 },
  sheetSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 24 },

  focusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  focusChip: { width: "30%", borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: "center", gap: 2 },
  focusChipNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  focusChipUnit: { fontSize: 11, fontFamily: "Inter_500Medium" },

  // Time spinner
  timeSpinnersRow: { flexDirection: "row", marginBottom: 24 },
  timeSpinnerDivider: { width: 1, marginHorizontal: 8 },
  timeSpinner: { flex: 1, alignItems: "center", gap: 10 },
  timeSpinnerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  timeSpinnerLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  timeSpinnerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeUnit: { alignItems: "center", gap: 4 },
  timeArrow: { padding: 4 },
  timeValueBox: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, minWidth: 52, alignItems: "center" },
  timeValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  timeColon: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 2 },
  ampmBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, marginLeft: 4 },
  ampmText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },

  copyright: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 20, lineHeight: 19 },
});
