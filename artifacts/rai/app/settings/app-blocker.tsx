import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, ActivityIndicator, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { AppBlocker, BlockedApp } from "@/modules/app-blocker";

export default function AppBlockerSettings() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [serviceEnabled, setServiceEnabled] = useState(false);
  const [installedApps, setInstalledApps] = useState<BlockedApp[]>([]);
  const [blockedApps, setBlockedApps] = useState<BlockedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setServiceEnabled(AppBlocker.isServiceEnabled());
    const blocked = await AppBlocker.getBlockedApps();
    setBlockedApps(blocked);
    const installed = await AppBlocker.getInstalledApps();
    setInstalledApps(installed);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleApp = (app: BlockedApp) => {
    Haptics.selectionAsync();
    void (async () => {
      const isBlocked = blockedApps.some((b) => b.packageName === app.packageName);
      const updated = isBlocked
        ? blockedApps.filter((b) => b.packageName !== app.packageName)
        : [...blockedApps, app];
      setBlockedApps(updated);
      await AppBlocker.setBlockedApps(updated);
    })();
  };

  const filtered = installedApps.filter((a) =>
    a.appName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>App Blocker</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          {/* How it works */}
          <View style={[styles.infoCard, { backgroundColor: "#6366F111", borderColor: "#6366F133" }]}>
            <Ionicons name="information-circle" size={18} color="#6366F1" />
            <Text style={styles.infoText}>
              RAI uses Android Accessibility Service to detect blocked app launches and redirect you back to the blocker screen.
            </Text>
          </View>

          {/* In-app lock status */}
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>IN-APP LOCK</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.serviceRow}>
              <View style={[styles.serviceIconWrap, { backgroundColor: serviceEnabled ? "#10B98122" : "#EF444422" }]}>
                <Ionicons name="shield-checkmark" size={22} color={serviceEnabled ? "#10B981" : "#EF4444"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceLabel, { color: colors.foreground }]}>
                  {serviceEnabled ? "Accessibility enabled" : "Accessibility not enabled"}
                </Text>
                <Text style={[styles.serviceSubtitle, { color: colors.mutedForeground }]}>
                  {serviceEnabled
                    ? "Blocked apps will be intercepted system-wide."
                    : "Enable accessibility to block selected apps on Android."}
                </Text>
              </View>
              {!serviceEnabled && (
                <TouchableOpacity
                  onPress={async () => {
                    await AppBlocker.requestAccessibilityPermission();
                  }}
                  style={styles.enableBtn}
                >
                  <Text style={styles.enableBtnText}>Enable</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Blocked apps summary */}
          {blockedApps.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>CURRENTLY BLOCKING ({blockedApps.length})</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {blockedApps.map((app, i) => (
                  <View
                    key={app.packageName}
                    style={[styles.appRow, { borderBottomColor: colors.border, borderBottomWidth: i < blockedApps.length - 1 ? 1 : 0 }]}
                  >
                    <View style={[styles.appIcon, { backgroundColor: "#EF444422" }]}>
                      <Ionicons name="ban" size={16} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.appName, { color: colors.foreground }]}>{app.appName}</Text>
                      <Text style={[styles.appPackage, { color: colors.mutedForeground }]} numberOfLines={1}>{app.packageName}</Text>
                    </View>
                    <Switch
                      value
                      onValueChange={() => toggleApp(app)}
                      trackColor={{ false: colors.border, true: "#EF4444" }}
                      thumbColor="#FFF"
                    />
                  </View>
                ))}
              </View>
            </>
          )}

          {/* App list */}
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>DANGEROUS APPS</Text>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search apps..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {filtered.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No apps found</Text>
              ) : (
                filtered.map((app, i) => {
                  const isBlocked = blockedApps.some((b) => b.packageName === app.packageName);
                  return (
                    <View
                      key={app.packageName}
                      style={[styles.appRow, { borderBottomColor: colors.border, borderBottomWidth: i < filtered.length - 1 ? 1 : 0 }]}
                    >
                      <View style={[styles.appIcon, { backgroundColor: isBlocked ? "#EF444422" : colors.secondary }]}>
                        <Ionicons name={isBlocked ? "ban" : "apps"} size={16} color={isBlocked ? "#EF4444" : colors.mutedForeground} />
                      </View>
                      <Text style={[styles.appName, { color: colors.foreground, flex: 1 }]}>{app.appName}</Text>
                      <Switch
                        value={isBlocked}
                        onValueChange={() => toggleApp(app)}
                        trackColor={{ false: colors.border, true: "#EF4444" }}
                        thumbColor="#FFF"
                      />
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 8 },
  sectionHeader: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginTop: 12, marginBottom: 4 },
  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#9CA3AF", lineHeight: 18 },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  serviceIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  serviceLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  serviceSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },
  enableBtn: { backgroundColor: "#6366F1", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  enableBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  appRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  appIcon: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  appPackage: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", padding: 24 },
});
