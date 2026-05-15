import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert, ActivityIndicator, Share, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { ProgressRing } from "@/components/ProgressRing";
import { uidToColor } from "@/lib/cloud";

type Tab = "leaderboard" | "activity" | "squad";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}hr ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SquadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, squad, activityFeed, createSquad, joinSquadByCode, leaveSquad, authUserId } = useApp();

  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [squadName, setSquadName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  // Login guard
  if (!authUserId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Squad</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
          <Ionicons name="people" size={52} color={colors.mutedForeground} />
          <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center" }}>
            Sign in to join a Squad
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 22 }}>
            Squads let you compete, share progress, and stay accountable with friends. Sign in to get started.
          </Text>
        </View>
      </View>
    );
  }

  // Build leaderboard from real squad members + yourself if not in squad
  const allMembers = squad
    ? [...squad.members].sort((a, b) => b.raiScore - a.raiScore)
    : [{ id: profile.id, name: profile.name, raiScore: profile.raiScore, xp: profile.xp, streak: profile.streak, lastActive: new Date().toISOString() }];

  const rankColors = ["#F59E0B", "#9CA3AF", "#CD7C2F"];

  const myActivityFeed = activityFeed.slice(0, 20);

  // ─── Leaderboard ───────────────────────────────────────────────────────────
  const renderLeaderboard = () => (
    <View style={styles.tabContent}>
      {squad && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.squadNameRow}>
            <Ionicons name="people" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{squad.name}</Text>
            <View style={[styles.codeBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
              <Text style={[styles.codeText, { color: colors.primary }]}>{squad.inviteCode}</Text>
            </View>
          </View>
          <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>
            {squad.members.length} member{squad.members.length !== 1 ? "s" : ""} · Tap code to copy invite link
          </Text>
        </View>
      )}

      {!squad && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.noSquadHint, { color: colors.mutedForeground }]}>
            Join or create a squad to compete with friends on the leaderboard.
          </Text>
        </View>
      )}

      {allMembers.map((member, i) => {
        const isMe = member.id === profile.id || member.id === authUserId;
        const isTop3 = i < 3 && squad;
        const color = member.avatarColor ?? uidToColor(member.id);
        return (
          <View
            key={member.id}
            style={[styles.memberCard, {
              backgroundColor: isMe ? colors.primary + "18" : colors.card,
              borderColor: isMe ? colors.primary : colors.border,
            }]}
          >
            <View style={styles.rankContainer}>
              {isTop3 ? (
                <View style={[styles.crownBadge, { backgroundColor: rankColors[i] + "22" }]}>
                  <Ionicons name="trophy" size={15} color={rankColors[i]} />
                </View>
              ) : (
                <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>{i + 1}</Text>
              )}
            </View>
            <View style={[styles.memberAvatar, { backgroundColor: member.avatarUrl ? "transparent" : color }]}>
              {member.avatarUrl ? (
                <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatarImg} />
              ) : (
                <Text style={styles.memberAvatarText}>{member.name[0]?.toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: colors.foreground }]}>
                {member.name}{isMe ? " (You)" : ""}
              </Text>
              <Text style={[styles.memberMeta, { color: colors.mutedForeground }]}>
                🔥 {member.streak}d · {timeAgo(member.lastActive)}
              </Text>
            </View>
            <View style={styles.memberScore}>
              <Text style={[styles.memberScoreValue, { color: isTop3 ? rankColors[i] : colors.foreground }]}>
                {member.raiScore}
              </Text>
              <Text style={[styles.memberScoreLabel, { color: colors.mutedForeground }]}>RAI</Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  // ─── Activity ──────────────────────────────────────────────────────────────
  const renderActivity = () => (
    <View style={styles.tabContent}>
      {myActivityFeed.length === 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center", gap: 10 }]}>
          <Ionicons name="pulse" size={32} color={colors.mutedForeground} />
          <Text style={[styles.noSquadHint, { color: colors.mutedForeground, textAlign: "center" }]}>
            No activity yet. Complete tasks to see your feed here.
          </Text>
        </View>
      )}
      {myActivityFeed.map((item) => (
        <View key={item.id} style={[styles.activityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.activityIcon, { backgroundColor: colors.primary + "22" }]}>
            <Ionicons
              name={item.actionType === "task_complete" ? "checkmark-circle" : item.actionType === "achievement" ? "trophy" : "flash"}
              size={18}
              color={colors.primary}
            />
          </View>
          <View style={styles.activityContent}>
            <Text style={[styles.activityText, { color: colors.foreground }]}>
              <Text style={{ fontFamily: "Inter_700Bold" }}>{item.userName}</Text>
              {item.actionType === "task_complete" && (
                <> completed <Text style={{ color: colors.primary }}>"{(item.actionData as any).taskTitle}"</Text></>
              )}
            </Text>
            <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
              {timeAgo(item.createdAt)}
              {(item.actionData as any).xpEarned ? ` · +${(item.actionData as any).xpEarned} XP` : ""}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  // ─── My Squad ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!squadName.trim()) { setError("Enter a squad name."); return; }
    setLoading(true); setError("");
    try {
      await createSquad(squadName.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreate(false); setSquadName("");
      setActiveTab("leaderboard");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create squad. Try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (inviteCode.trim().length !== 6) { setError("Enter a 6-character invite code."); return; }
    setLoading(true); setError("");
    try {
      const ok = await joinSquadByCode(inviteCode.trim());
      if (ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowJoin(false); setInviteCode("");
        setActiveTab("leaderboard");
      } else {
        setError("Invalid code. Check with your squad leader.");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to join squad. Try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!squad) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `Join my RAI squad "${squad.name}"! Use invite code: ${squad.inviteCode}`,
      title: "Join my RAI Squad",
    });
  };

  const handleLeave = () => {
    Alert.alert("Leave Squad", "Are you sure you want to leave your squad?", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: leaveSquad },
    ]);
  };

  const renderMySquad = () => {
    if (squad) {
      return (
        <View style={styles.tabContent}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 16 }]}>
            <View style={styles.squadNameRow}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground, fontSize: 18 }]}>{squad.name}</Text>
            </View>

            <TouchableOpacity
              onPress={handleCopyCode}
              style={[styles.inviteRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <View>
                <Text style={[styles.inviteCode, { color: colors.primary }]}>{squad.inviteCode}</Text>
                <Text style={[styles.inviteLabel, { color: colors.mutedForeground }]}>Tap to copy invite code</Text>
              </View>
              <Ionicons name="copy-outline" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <View style={styles.memberListHeader}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Members ({squad.members.length})</Text>
            </View>
            {squad.members.map((m) => {
              const isMe = m.id === profile.id || m.id === authUserId;
              const color = m.avatarColor ?? uidToColor(m.id);
              return (
                <View key={m.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.memberAvatar, { backgroundColor: m.avatarUrl ? "transparent" : color, width: 36, height: 36, borderRadius: 18 }]}>
                    {m.avatarUrl ? (
                      <Image source={{ uri: m.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                    ) : (
                      <Text style={[styles.memberAvatarText, { fontSize: 14 }]}>{m.name[0]?.toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: colors.foreground, fontSize: 14 }]}>
                      {m.name}{isMe ? " (You)" : ""}
                    </Text>
                    <Text style={[styles.memberMeta, { color: colors.mutedForeground }]}>
                      {m.raiScore} RAI · 🔥 {m.streak}d
                    </Text>
                  </View>
                  <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{timeAgo(m.lastActive)}</Text>
                </View>
              );
            })}

            <TouchableOpacity
              onPress={handleLeave}
              style={[styles.leaveBtn, { borderColor: "#EF4444" + "44" }]}
            >
              <Ionicons name="exit-outline" size={16} color="#EF4444" />
              <Text style={[styles.leaveBtnText]}>Leave Squad</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center", gap: 16 }]}>
          <Ionicons name="people" size={48} color={colors.mutedForeground} />
          <Text style={[styles.cardTitle, { color: colors.foreground, fontSize: 18 }]}>No squad yet</Text>
          <Text style={[styles.noSquadHint, { color: colors.mutedForeground, textAlign: "center" }]}>
            Join a squad or create one to compete, share progress, and stay accountable together.
          </Text>

          <View style={styles.squadBtns}>
            <TouchableOpacity
              onPress={() => { setShowJoin(true); setShowCreate(false); setError(""); }}
              style={[styles.squadBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
            >
              <Ionicons name="enter" size={18} color={colors.primary} />
              <Text style={[styles.squadBtnText, { color: colors.primary }]}>Join Squad</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowCreate(true); setShowJoin(false); setError(""); }}
              style={[styles.squadBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add-circle" size={18} color="#FFF" />
              <Text style={[styles.squadBtnText, { color: "#FFF" }]}>Create Squad</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {showCreate && (
            <View style={styles.form}>
              <TextInput
                style={[styles.codeInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground, letterSpacing: 1, textAlign: "left", fontSize: 16 }]}
                placeholder="Squad name, e.g. 'Grind Squad'"
                placeholderTextColor={colors.mutedForeground}
                value={squadName}
                onChangeText={setSquadName}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleCreate}
                disabled={loading}
                style={[styles.joinBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.joinBtnText}>Create</Text>}
              </TouchableOpacity>
            </View>
          )}

          {showJoin && (
            <View style={styles.form}>
              <TextInput
                style={[styles.codeInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Enter 6-char invite code"
                placeholderTextColor={colors.mutedForeground}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleJoin}
                disabled={loading}
                style={[styles.joinBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.joinBtnText}>Join</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Squad</Text>
        <View style={styles.tabRow}>
          {(["leaderboard", "activity", "squad"] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabBtn, {
                backgroundColor: activeTab === tab ? colors.primary : colors.secondary,
                borderColor: activeTab === tab ? colors.primary : colors.border,
              }]}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === tab ? "#FFF" : colors.mutedForeground }]}>
                {tab === "leaderboard" ? "Leaderboard" : tab === "activity" ? "Activity" : "My Squad"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "leaderboard" && renderLeaderboard()}
        {activeTab === "activity" && renderActivity()}
        {activeTab === "squad" && renderMySquad()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", gap: 8 },
  tabBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: "center" },
  tabBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tabContent: { padding: 16, gap: 10 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  squadNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  codeBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  codeText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  memberCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noSquadHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  memberCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  rankContainer: { width: 32, alignItems: "center" },
  rankNum: { fontSize: 15, fontFamily: "Inter_700Bold" },
  crownBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  memberAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  memberAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  memberMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  memberScore: { alignItems: "flex-end" },
  memberScoreValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  memberScoreLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  activityItem: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 12, gap: 12 },
  activityIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  activityContent: { flex: 1 },
  activityText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  activityTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  squadBtns: { flexDirection: "row", gap: 10, width: "100%" },
  squadBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 12 },
  squadBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  form: { width: "100%", gap: 10 },
  codeInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: 4 },
  joinBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  joinBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#EF4444", textAlign: "center" },
  inviteRow: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 16, alignItems: "center", justifyContent: "space-between" },
  inviteCode: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 6 },
  inviteLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  memberListHeader: { flexDirection: "row", alignItems: "center" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  leaveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingVertical: 10, marginTop: 4 },
  leaveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#EF4444" },
});
