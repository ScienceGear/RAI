import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { ProgressRing } from "@/components/ProgressRing";

type Tab = "leaderboard" | "activity" | "squad";

const DEMO_MEMBERS = [
  { id: "1", name: "Arjun K.", raiScore: 847, xp: 4200, streak: 14, lastActive: "2min ago", avatarColor: "#6366F1" },
  { id: "2", name: "Riya S.", raiScore: 732, xp: 3600, streak: 9, lastActive: "15min ago", avatarColor: "#10B981" },
  { id: "3", name: "Vikram R.", raiScore: 698, xp: 3100, streak: 7, lastActive: "1hr ago", avatarColor: "#F97316" },
  { id: "4", name: "Meera T.", raiScore: 545, xp: 2400, streak: 3, lastActive: "3hr ago", avatarColor: "#EC4899" },
];

const DEMO_ACTIVITY = [
  { id: "1", user: "Riya S.", action: "completed", detail: "Morning Run", time: "2min ago", icon: "checkmark-circle", color: "#10B981" },
  { id: "2", user: "Arjun K.", action: "hit a", detail: "14-day streak", time: "15min ago", icon: "flame", color: "#F97316" },
  { id: "3", user: "Vikram R.", action: "finished", detail: "90-min Deep Work session", time: "1hr ago", icon: "time", color: "#6366F1" },
  { id: "4", user: "Meera T.", action: "completed", detail: "Client Proposal", time: "3hr ago", icon: "checkmark-circle", color: "#10B981" },
  { id: "5", user: "Arjun K.", action: "unlocked", detail: "Deep Diver achievement", time: "5hr ago", icon: "trophy", color: "#F59E0B" },
];

export default function SquadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, squad, activityFeed } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const weeklyTarget = 20;
  const weeklyProgress = 14;
  const myRank = 1;

  const allMembers = [
    { id: profile.id, name: profile.name, raiScore: profile.raiScore, xp: profile.xp, streak: profile.streak, lastActive: "Now", avatarColor: "#6366F1" },
    ...DEMO_MEMBERS,
  ].sort((a, b) => b.raiScore - a.raiScore);

  const rankColors = ["#F59E0B", "#9CA3AF", "#CD7C2F"];

  const renderLeaderboard = () => (
    <View style={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Weekly Challenge</Text>
        <Text style={[styles.challengeDesc, { color: colors.mutedForeground }]}>
          Complete 20 focus hours this week
        </Text>
        <View style={styles.progressRow}>
          <ProgressRing size={60} strokeWidth={6} progress={weeklyProgress / weeklyTarget} color="#6366F1" trackColor={colors.border}>
            <Text style={[styles.progressNum, { color: colors.primary }]}>{weeklyProgress}</Text>
          </ProgressRing>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressText, { color: colors.foreground }]}>
              {weeklyProgress}/{weeklyTarget} hours
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${(weeklyProgress / weeklyTarget) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>
        </View>
      </View>

      {allMembers.map((member, i) => {
        const isMe = member.id === profile.id;
        const isTop3 = i < 3;
        return (
          <View
            key={member.id}
            style={[styles.memberCard, {
              backgroundColor: isMe ? colors.primary + "22" : colors.card,
              borderColor: isMe ? colors.primary : colors.border,
            }]}
          >
            <View style={styles.rankContainer}>
              {isTop3 ? (
                <View style={[styles.crownBadge, { backgroundColor: rankColors[i] + "22" }]}>
                  <Ionicons name="trophy" size={16} color={rankColors[i]} />
                </View>
              ) : (
                <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>{i + 1}</Text>
              )}
            </View>
            <View style={[styles.memberAvatar, { backgroundColor: member.avatarColor }]}>
              <Text style={styles.memberAvatarText}>{member.name[0]}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: colors.foreground }]}>
                {member.name} {isMe && "(You)"}
              </Text>
              <Text style={[styles.memberMeta, { color: colors.mutedForeground }]}>
                {member.streak} day streak · {member.lastActive}
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

  const renderActivity = () => (
    <View style={styles.tabContent}>
      {DEMO_ACTIVITY.map((item) => (
        <View key={item.id} style={[styles.activityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.activityIcon, { backgroundColor: item.color + "22" }]}>
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={item.color} />
          </View>
          <View style={styles.activityContent}>
            <Text style={[styles.activityText, { color: colors.foreground }]}>
              <Text style={{ fontFamily: "Inter_700Bold" }}>{item.user}</Text>
              {" "}{item.action}{" "}
              <Text style={{ color: colors.primary }}>"{item.detail}"</Text>
            </Text>
            <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{item.time}</Text>
          </View>
        </View>
      ))}
      {activityFeed.slice(0, 5).map((item) => (
        <View key={item.id} style={[styles.activityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.activityIcon, { backgroundColor: colors.primary + "22" }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          </View>
          <View style={styles.activityContent}>
            <Text style={[styles.activityText, { color: colors.foreground }]}>
              <Text style={{ fontFamily: "Inter_700Bold" }}>{item.userName}</Text>
              {" completed "}
              <Text style={{ color: colors.primary }}>"{(item.actionData as any).taskTitle}"</Text>
            </Text>
            <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderMySquad = () => (
    <View style={styles.tabContent}>
      {!squad ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center", gap: 16 }]}>
          <Ionicons name="people" size={48} color={colors.mutedForeground} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>No squad yet</Text>
          <Text style={[styles.challengeDesc, { color: colors.mutedForeground, textAlign: "center" }]}>
            Join a squad or create one to compete, share progress, and stay accountable together.
          </Text>
          <View style={styles.squadBtns}>
            <TouchableOpacity
              onPress={() => setShowJoin(true)}
              style={[styles.squadBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
            >
              <Ionicons name="enter" size={18} color={colors.primary} />
              <Text style={[styles.squadBtnText, { color: colors.primary }]}>Join Squad</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
              style={[styles.squadBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add-circle" size={18} color="#FFF" />
              <Text style={[styles.squadBtnText, { color: "#FFF" }]}>Create Squad</Text>
            </TouchableOpacity>
          </View>

          {showJoin && (
            <View style={styles.joinForm}>
              <TextInput
                style={[styles.codeInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Enter 6-char invite code..."
                placeholderTextColor={colors.mutedForeground}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                maxLength={6}
              />
              <TouchableOpacity style={[styles.joinBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.joinBtnText}>Join</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{squad.name}</Text>
          <View style={[styles.inviteRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.inviteCode, { color: colors.primary }]}>{squad.inviteCode}</Text>
            <Text style={[styles.inviteLabel, { color: colors.mutedForeground }]}>Invite code</Text>
          </View>
        </View>
      )}
    </View>
  );

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

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }} showsVerticalScrollIndicator={false}>
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
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  challengeDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  progressNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  progressInfo: { flex: 1, gap: 8 },
  progressText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  memberCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  rankContainer: { width: 32, alignItems: "center" },
  rankNum: { fontSize: 15, fontFamily: "Inter_700Bold" },
  crownBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
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
  joinForm: { width: "100%", gap: 10 },
  codeInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: 4 },
  joinBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  joinBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  inviteRow: { borderRadius: 10, borderWidth: 1, padding: 16, alignItems: "center", gap: 4 },
  inviteCode: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 6 },
  inviteLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
