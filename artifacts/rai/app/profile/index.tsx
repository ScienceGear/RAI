import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, TextInput, Alert, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { ProgressRing } from "@/components/ProgressRing";
import { xpToNextLevel, getLevelTitle } from "@/lib/xp";
import { getRaiScoreTier, getCategoryColor } from "@/constants/categories";

const AVATAR_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444",
  "#F97316", "#10B981", "#0EA5E9", "#F59E0B",
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, tasks, focusSessions, achievements } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editAge, setEditAge] = useState(String(profile.age ?? ""));
  const [editColor, setEditColor] = useState(profile.avatarColor ?? "#6366F1");
  const [editPhotoUri, setEditPhotoUri] = useState<string | undefined>(profile.avatarUrl);

  const saveDebounce = useRef<ReturnType<typeof setTimeout>>();

  const xpInfo = xpToNextLevel(profile.xp);
  const levelTitle = getLevelTitle(profile.level);
  const scoreTier = getRaiScoreTier(profile.raiScore);
  const completedTasks = tasks.filter((t) => t.completed);
  const totalFocusHours = Math.round(focusSessions.reduce((a, s) => a + s.completedMinutes, 0) / 60);
  const unlockedAchievements = achievements.filter((a) => a.unlocked).length;

  const categoryBreakdown = completedTasks.reduce((acc, task) => {
    acc[task.categoryPrimary] = (acc[task.categoryPrimary] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const startEdit = () => {
    setEditName(profile.name);
    setEditAge(String(profile.age ?? ""));
    setEditColor(profile.avatarColor ?? "#6366F1");
    setEditPhotoUri(profile.avatarUrl);
    setEditing(true);
    Haptics.selectionAsync();
  };

  const cancelEdit = () => {
    setEditing(false);
    Haptics.selectionAsync();
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to set a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setEditPhotoUri(result.assets[0].uri);
      Haptics.selectionAsync();
    }
  };

  const removePhoto = () => {
    setEditPhotoUri(undefined);
    Haptics.selectionAsync();
  };

  const saveEdit = () => {
    if (!editName.trim()) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    if (saveDebounce.current) clearTimeout(saveDebounce.current);
    saveDebounce.current = setTimeout(async () => {
      const ageNum = editAge.trim() ? parseInt(editAge.trim(), 10) : undefined;
      if (editAge.trim() && (isNaN(ageNum!) || ageNum! < 5 || ageNum! > 120)) {
        Alert.alert("Invalid Age", "Please enter an age between 5 and 120.");
        return;
      }
      const firstName = editName.trim().split(" ")[0];
      await updateProfile({
        name: editName.trim(),
        firstName,
        avatarColor: editColor,
        avatarUrl: editPhotoUri,
        age: ageNum,
      });
      setEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 300);
  };

  const displayPhotoUri = editing ? editPhotoUri : profile.avatarUrl;
  const avatarColor = editing ? editColor : (profile.avatarColor ?? "#6366F1");
  const initials = (editing ? editName : profile.name)
    .trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={editing ? cancelEdit : () => router.back()}>
          <Ionicons name={editing ? "close" : "chevron-back"} size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{editing ? "Edit Profile" : "Profile"}</Text>
        {editing ? (
          <TouchableOpacity onPress={saveEdit}>
            <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={startEdit}>
            <Ionicons name="pencil" size={20} color={colors.foreground} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Hero / Avatar ── */}
        <View style={[styles.heroSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={editing ? pickPhoto : undefined} activeOpacity={editing ? 0.7 : 1}>
            {displayPhotoUri ? (
              <Image source={{ uri: displayPhotoUri }} style={styles.avatarLarge} />
            ) : (
              <View style={[styles.avatarLarge, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarLargeText}>{initials}</Text>
              </View>
            )}
            {editing && (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          {editing ? (
            <View style={styles.editAvatarActions}>
              <TouchableOpacity onPress={pickPhoto} style={[styles.avatarActionBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="image" size={14} color="#FFF" />
                <Text style={styles.avatarActionText}>Choose Photo</Text>
              </TouchableOpacity>
              {editPhotoUri && (
                <TouchableOpacity onPress={removePhoto} style={[styles.avatarActionBtn, { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }]}>
                  <Ionicons name="trash-outline" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.avatarActionText, { color: colors.mutedForeground }]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <Text style={[styles.userName, { color: colors.foreground }]}>{profile.name}</Text>
              {profile.age ? (
                <Text style={[styles.userAge, { color: colors.mutedForeground }]}>Age {profile.age}</Text>
              ) : null}
              <Text style={[styles.userTier, { color: colors.accent }]}>{scoreTier.title}</Text>
              <View style={styles.streakRow}>
                <Ionicons name="flame" size={16} color="#F97316" />
                <Text style={[styles.streakText, { color: colors.foreground }]}>{profile.streak}-day streak</Text>
              </View>
            </>
          )}

          {editing && !editPhotoUri && (
            <View style={styles.colorPickerSection}>
              <Text style={[styles.colorPickerLabel, { color: colors.mutedForeground }]}>Or pick an avatar color</Text>
              <View style={styles.colorDotRow}>
                {AVATAR_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { setEditColor(c); Haptics.selectionAsync(); }}
                    style={[styles.colorDot, { backgroundColor: c, borderWidth: editColor === c ? 3 : 0, borderColor: "#FFF" }]}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ── Edit Fields ── */}
        {editing && (
          <View style={{ padding: 16, gap: 14 }}>
            <View style={[styles.fieldGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.fieldRow}>
                <View style={[styles.fieldIcon, { backgroundColor: "#6366F122" }]}>
                  <Ionicons name="person" size={16} color="#6366F1" />
                </View>
                <View style={styles.fieldBody}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full Name</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.foreground }]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Your name"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>
              <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
              <View style={styles.fieldRow}>
                <View style={[styles.fieldIcon, { backgroundColor: "#10B98122" }]}>
                  <Ionicons name="calendar" size={16} color="#10B981" />
                </View>
                <View style={styles.fieldBody}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Age</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.foreground }]}
                    value={editAge}
                    onChangeText={setEditAge}
                    placeholder="Optional"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    maxLength={3}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={saveEdit} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Stats ── */}
        {!editing && (
          <View style={styles.content}>
            <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ProgressRing size={80} strokeWidth={7} progress={xpInfo.progress} gradient trackColor={colors.border}>
                <Text style={[styles.levelNum, { color: colors.primary }]}>{profile.level}</Text>
              </ProgressRing>
              <View style={styles.levelInfo}>
                <Text style={[styles.levelTitle, { color: colors.foreground }]}>Level {profile.level} · {levelTitle}</Text>
                <Text style={[styles.levelXP, { color: colors.mutedForeground }]}>{profile.xp} total XP</Text>
                <View style={[styles.xpBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.xpFill, { width: `${xpInfo.progress * 100}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>
                  {xpInfo.current}/{xpInfo.needed} XP to next level
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              {[
                { label: "Tasks Done", value: completedTasks.length, icon: "checkmark-circle", color: colors.success },
                { label: "Focus Hours", value: `${totalFocusHours}h`, icon: "time", color: colors.primary },
                { label: "Best Streak", value: `${profile.longestStreak}d`, icon: "flame", color: "#F97316" },
                { label: "Achievements", value: unlockedAchievements, icon: "trophy", color: "#F59E0B" },
                { label: "RAI Score", value: profile.raiScore, icon: "star", color: colors.accent },
                { label: "Sessions", value: focusSessions.length, icon: "timer", color: colors.teal },
              ].map((s) => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={20} color={s.color} />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {Object.keys(categoryBreakdown).length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Category Breakdown</Text>
                {Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, count]) => (
                  <View key={cat} style={styles.catRow}>
                    <View style={[styles.catDot, { backgroundColor: getCategoryColor(cat, true) }]} />
                    <Text style={[styles.catName, { color: colors.foreground }]}>{cat}</Text>
                    <Text style={[styles.catCount, { color: colors.mutedForeground }]}>{count} tasks</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.quickLinks}>
              {[
                { label: "Achievements", icon: "trophy", onPress: () => router.push("/achievements") },
                { label: "Goals", icon: "flag", onPress: () => router.push("/goals") },
                { label: "Confidence Builder", icon: "sparkles", onPress: () => router.push("/confidence") },
                { label: "Diary", icon: "journal", onPress: () => router.push("/diary") },
                { label: "Settings", icon: "settings", onPress: () => router.push("/settings") },
              ].map((link) => (
                <TouchableOpacity
                  key={link.label}
                  onPress={link.onPress}
                  style={[styles.quickLink, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Ionicons name={link.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
                  <Text style={[styles.quickLinkText, { color: colors.foreground }]}>{link.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  saveText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  heroSection: { alignItems: "center", paddingVertical: 32, gap: 10, borderBottomWidth: 1 },
  avatarLarge: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  avatarLargeText: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#FFF" },
  avatarEditBadge: { position: "absolute", bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: "#6366F1", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#0A0A0F" },
  editAvatarActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  avatarActionBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  avatarActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  colorPickerSection: { alignItems: "center", gap: 8, marginTop: 4 },
  colorPickerLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  colorDotRow: { flexDirection: "row", gap: 12 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold" },
  userAge: { fontSize: 14, fontFamily: "Inter_400Regular" },
  userTier: { fontSize: 15, fontFamily: "Inter_500Medium" },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fieldGroup: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  fieldRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  fieldDivider: { height: 1 },
  fieldIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fieldBody: { flex: 1, gap: 2 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.8 },
  fieldInput: { fontSize: 16, fontFamily: "Inter_500Medium", paddingVertical: 0 },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  content: { padding: 16, gap: 14 },
  levelCard: { flexDirection: "row", gap: 16, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center" },
  levelNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  levelInfo: { flex: 1, gap: 4 },
  levelTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  levelXP: { fontSize: 12, fontFamily: "Inter_400Regular" },
  xpBar: { height: 4, borderRadius: 2, overflow: "hidden", marginVertical: 2 },
  xpFill: { height: "100%", borderRadius: 2 },
  xpLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "30%", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4, flexGrow: 1 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  catRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  catCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  quickLinks: { gap: 8 },
  quickLink: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  quickLinkText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
});
