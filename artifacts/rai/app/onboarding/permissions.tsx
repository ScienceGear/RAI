import React, { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useApp } from "@/contexts/AppContext";
import { UsageStatsBridge } from "@/src/native/UsageStatsBridge";
import { AppBlocker } from "@/modules/app-blocker";
import {
  getPermissionGateStatus,
  persistPermissionStatus,
  syncPermissionsToSupabase,
} from "@/src/services/PermissionGateService";

type GateState = {
  notificationsGranted: boolean;
  usageAccessGranted: boolean;
  batteryExempt: boolean;
  accessibilityGranted: boolean;
};

export default function OnboardingPermissions() {
  const { updateProfile, authUserId } = useApp();
  const hasRequestedNotifications = useRef(false);
  const [state, setState] = useState<GateState>({
    notificationsGranted: false,
    usageAccessGranted: false,
    batteryExempt: false,
    accessibilityGranted: false,
  });

  const isComplete =
    state.notificationsGranted &&
    state.usageAccessGranted &&
    state.batteryExempt &&
    state.accessibilityGranted;

  const refresh = async () => {
    const status = await getPermissionGateStatus();
    const complete =
      status.notificationsGranted &&
      status.usageAccessGranted &&
      status.batteryExempt &&
      status.accessibilityGranted;
    setState({
      notificationsGranted: status.notificationsGranted,
      usageAccessGranted: status.usageAccessGranted,
      batteryExempt: status.batteryExempt,
      accessibilityGranted: status.accessibilityGranted,
    });
    await persistPermissionStatus({ ...status, done: complete });
  };

  useEffect(() => {
    void refresh();
    if (!hasRequestedNotifications.current) {
      hasRequestedNotifications.current = true;
      void Notifications.requestPermissionsAsync().then(() => refresh());
    }
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void refresh();
    });
    return () => sub.remove();
  }, []);

  const continueToApp = async () => {
    if (!isComplete) return;
    await updateProfile({
      permissionsRequested: true,
      notificationsGranted: true,
      usageStatsGranted: true,
      usageAccessGranted: true,
      batteryExempt: true,
      accessibilityGranted: true,
      permissionsComplete: true,
    });
    if (authUserId) {
      await syncPermissionsToSupabase(authUserId);
    }
    router.replace("/(tabs)/home");
  };

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A", "#130A28"]} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Enable required permissions</Text>
        <Text style={styles.subtitle}>
          RAI needs all permissions below to personalize your score, danger zones, and app blocking.
        </Text>

        <View style={styles.card}>
          <PermissionRow
            label="Notifications"
            granted={state.notificationsGranted}
            actionLabel="Grant"
            onPress={async () => {
              await Notifications.requestPermissionsAsync();
              await refresh();
            }}
          />
          <PermissionRow
            label="Screen time (Usage Access)"
            granted={state.usageAccessGranted}
            actionLabel="Open"
            onPress={async () => {
              await UsageStatsBridge.requestUsageAccess();
            }}
          />
          <PermissionRow
            label="Battery optimization"
            granted={state.batteryExempt}
            actionLabel="Open"
            onPress={async () => {
              await UsageStatsBridge.requestIgnoreBatteryOptimizations();
            }}
          />
          <PermissionRow
            label="Accessibility service"
            granted={state.accessibilityGranted}
            actionLabel="Open"
            onPress={async () => {
              await AppBlocker.requestAccessibilityPermission();
            }}
          />
        </View>

        <TouchableOpacity style={styles.recheckBtn} onPress={() => void refresh()}>
          <Text style={styles.recheckText}>I granted permissions — Recheck</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueBtn, { opacity: isComplete ? 1 : 0.45 }]}
          onPress={() => void continueToApp()}
          disabled={!isComplete}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>

        {!isComplete && (
          <Text style={styles.blockedText}>You cannot continue until all required permissions are granted.</Text>
        )}
      </View>
    </LinearGradient>
  );
}

function PermissionRow({
  label,
  granted,
  actionLabel,
  onPress,
}: {
  label: string;
  granted: boolean;
  actionLabel: string;
  onPress: () => void | Promise<void>;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowStatus, granted ? styles.granted : styles.missing]}>
          {granted ? "Granted" : "Missing"}
        </Text>
      </View>
      {!granted && (
        <TouchableOpacity style={styles.actionBtn} onPress={() => void onPress()}>
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", padding: 24, gap: 14 },
  title: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { color: "#9CA3AF", fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 14, borderWidth: 1, borderColor: "#27272A", backgroundColor: "#11111B", overflow: "hidden" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2B2B3C",
  },
  rowLeft: { flex: 1 },
  rowLabel: { color: "#E5E7EB", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  rowStatus: { marginTop: 2, fontFamily: "Inter_500Medium", fontSize: 12 },
  granted: { color: "#10B981" },
  missing: { color: "#EF4444" },
  actionBtn: { backgroundColor: "#4F46E5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  actionBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  recheckBtn: { borderRadius: 12, borderWidth: 1, borderColor: "#3B3B57", alignItems: "center", padding: 12 },
  recheckText: { color: "#D1D5DB", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  continueBtn: {
    borderRadius: 12,
    backgroundColor: "#6366F1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
  },
  continueText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  blockedText: { color: "#EF4444", textAlign: "center", fontFamily: "Inter_500Medium", fontSize: 12 },
});
