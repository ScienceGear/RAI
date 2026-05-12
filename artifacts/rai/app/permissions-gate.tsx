import React, { useEffect, useState } from "react";
import { AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { useApp } from "@/contexts/AppContext";
import { UsageStatsBridge } from "@/src/native/UsageStatsBridge";
import {
  getPermissionGateStatus,
  persistPermissionStatus,
  syncPermissionsToSupabase,
} from "@/src/services/PermissionGateService";

type GateState = {
  notificationsGranted: boolean;
  usageAccessGranted: boolean;
  batteryExempt: boolean;
};

export default function PermissionsGateScreen() {
  const { authUserId, updateProfile } = useApp();
  const [state, setState] = useState<GateState>({
    notificationsGranted: false,
    usageAccessGranted: false,
    batteryExempt: false,
  });

  const refresh = async () => {
    const status = await getPermissionGateStatus();
    setState({
      notificationsGranted: status.notificationsGranted,
      usageAccessGranted: status.usageAccessGranted,
      batteryExempt: status.batteryExempt,
    });

    const complete = status.notificationsGranted && status.usageAccessGranted && status.batteryExempt;
    await persistPermissionStatus({ ...status, done: complete });

    if (complete) {
      await updateProfile({
        notificationsGranted: true,
        usageStatsGranted: true,
        permissionsRequested: true,
        permissionsComplete: true,
        usageAccessGranted: true,
        batteryExempt: true,
      });
      if (authUserId) {
        await syncPermissionsToSupabase(authUserId);
      }
      router.replace("/(tabs)/home");
    }
  };

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void refresh();
    });
    return () => sub.remove();
  }, [authUserId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Permissions required</Text>
      <Text style={styles.subtitle}>RAI is locked until all required Android permissions are granted.</Text>

      <View style={styles.card}>
        <PermissionRow
          label="POST_NOTIFICATIONS"
          granted={state.notificationsGranted}
          actionLabel="Grant notifications"
          onPress={async () => {
            await Notifications.requestPermissionsAsync();
            await refresh();
          }}
        />
        <PermissionRow
          label="PACKAGE_USAGE_STATS"
          granted={state.usageAccessGranted}
          actionLabel="Open usage access"
          onPress={async () => {
            await UsageStatsBridge.requestUsageAccess();
          }}
        />
        <PermissionRow
          label="REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"
          granted={state.batteryExempt}
          actionLabel="Disable battery optimization"
          onPress={async () => {
            await UsageStatsBridge.requestIgnoreBatteryOptimizations();
          }}
        />
      </View>

      <TouchableOpacity style={styles.refreshBtn} onPress={() => void refresh()}>
        <Text style={styles.refreshText}>I granted permissions — Recheck</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingsBtn} onPress={() => Linking.openSettings()}>
        <Text style={styles.settingsText}>Open app settings</Text>
      </TouchableOpacity>
    </View>
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
      <View style={styles.left}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.status, granted ? styles.granted : styles.missing]}>
          {granted ? "Granted" : "Missing"}
        </Text>
      </View>
      {!granted && (
        <TouchableOpacity style={styles.actionBtn} onPress={() => void onPress()}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090911",
    justifyContent: "center",
    padding: 20,
    gap: 14,
  },
  title: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { color: "#9CA3AF", fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  card: { borderWidth: 1, borderColor: "#27272A", borderRadius: 14, padding: 14, gap: 10, backgroundColor: "#11111B" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  left: { flex: 1, gap: 2 },
  label: { color: "#E5E7EB", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  status: { fontFamily: "Inter_500Medium", fontSize: 12 },
  granted: { color: "#10B981" },
  missing: { color: "#EF4444" },
  actionBtn: { backgroundColor: "#4F46E5", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  actionText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  refreshBtn: { backgroundColor: "#1D4ED8", borderRadius: 12, alignItems: "center", padding: 13 },
  refreshText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  settingsBtn: { borderWidth: 1, borderColor: "#374151", borderRadius: 12, alignItems: "center", padding: 13 },
  settingsText: { color: "#9CA3AF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});

