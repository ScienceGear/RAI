import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { chatWithDiary } from "@/lib/ai";
import { DiaryMessage, DiaryEntry } from "@/types";

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

function makeDateStrip(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

const WELCOME_MSG = (name: string): DiaryMessage => ({
  id: "welcome",
  role: "assistant",
  content: `How was your day, ${name}? What was the hardest moment?`,
  timestamp: new Date().toISOString(),
});

export default function DiaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, diary, addDiaryEntry, updateDiaryEntry, moodLogs, todayFocusScore } = useApp();

  const today = new Date().toISOString().split("T")[0];
  const dateStrip = makeDateStrip();

  const [selectedDate, setSelectedDate] = useState(today);
  const [messages, setMessages] = useState<DiaryMessage[]>([WELCOME_MSG(profile.firstName)]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const recentMood = moodLogs[0]?.mood ?? 3;
  const isToday = selectedDate === today;

  const selectedEntry = diary.find((d) => d.date === selectedDate);

  // Sync messages whenever diary loads from Firestore or the selected date changes
  useEffect(() => {
    if (selectedEntry?.messages?.length) {
      setMessages(selectedEntry.messages);
    } else if (isToday) {
      setMessages([WELCOME_MSG(profile.firstName)]);
    } else {
      setMessages([]);
    }
  }, [selectedDate, selectedEntry?.messages?.length]);

  const selectDate = (date: string) => {
    Haptics.selectionAsync();
    setSelectedDate(date);
    setInputText("");
  };

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !isToday) return;
    await Haptics.selectionAsync();

    const userMsg: DiaryMessage = {
      id: genId(),
      role: "user",
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    setIsTyping(true);

    const entryId = selectedEntry?.id ?? genId();

    if (!selectedEntry) {
      const newEntry: DiaryEntry = {
        id: entryId,
        date: today,
        messages: updatedMessages,
        mood: recentMood,
        createdAt: new Date().toISOString(),
      };
      await addDiaryEntry(newEntry);
    } else {
      await updateDiaryEntry(entryId, { messages: updatedMessages });
    }

    try {
      const response = await chatWithDiary(updatedMessages, {
        name: profile.firstName,
        todayScore: todayFocusScore,
        recentMood,
      });

      const aiMsg: DiaryMessage = {
        id: genId(),
        role: "assistant",
        content: response || "That's really valuable to reflect on. How did it make you feel?",
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      await updateDiaryEntry(entryId, { messages: finalMessages });
    } catch {
      const aiMsg: DiaryMessage = {
        id: genId(),
        role: "assistant",
        content: "I'm here. Tell me more about that.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, messages, profile, todayFocusScore, recentMood, isToday, selectedEntry]);

  const renderMessage = ({ item }: { item: DiaryMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={[styles.aiAvatar, { backgroundColor: "#6366F1" }]}>
            <Text style={styles.aiAvatarText}>R</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? {
          backgroundColor: "#6366F1",
          borderBottomRightRadius: 4,
        } : {
          backgroundColor: "#12121C",
          borderColor: "#1E1E2E",
          borderWidth: 1,
          borderBottomLeftRadius: 4,
        }]}>
          <Text style={[styles.bubbleText, { color: isUser ? "#FFF" : "#E5E7EB" }]}>
            {item.content}
          </Text>
          <Text style={[styles.bubbleTime, { color: isUser ? "#FFFFFF88" : "#6B7280" }]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
          </Text>
        </View>
      </View>
    );
  };

  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 20 : 44);

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A"]} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>RAI Diary</Text>
            <Text style={styles.headerSub}>{formatDate(selectedDate)}</Text>
          </View>
          <View style={[styles.moodBadge, { backgroundColor: "#6366F122" }]}>
            <Text style={styles.moodEmoji}>{["😫", "😟", "😐", "🙂", "🤩"][recentMood - 1]}</Text>
          </View>
        </View>

        {/* ── Date Strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStrip}
        >
          {dateStrip.map((date) => {
            const hasEntry = diary.some((d) => d.date === date);
            const isSelected = date === selectedDate;
            const d = new Date(date + "T00:00:00");
            return (
              <TouchableOpacity
                key={date}
                onPress={() => selectDate(date)}
                style={[
                  styles.dateChip,
                  isSelected && { backgroundColor: "#6366F1", borderColor: "#6366F1" },
                  !isSelected && { backgroundColor: "#12121C", borderColor: "#1E1E2E" },
                ]}
              >
                <Text style={[styles.dateChipDay, { color: isSelected ? "#FFF" : "#9CA3AF" }]}>
                  {date === today ? "Today" : d.toLocaleDateString("en", { weekday: "short" })}
                </Text>
                <Text style={[styles.dateChipNum, { color: isSelected ? "#FFF" : "#6B7280" }]}>
                  {d.getDate()}
                </Text>
                {hasEntry && (
                  <View style={[styles.entryDot, { backgroundColor: isSelected ? "#FFF" : "#6366F1" }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Messages ── */}
        {messages.length === 0 && !isToday ? (
          <View style={styles.emptyState}>
            <Ionicons name="journal-outline" size={40} color="#374151" />
            <Text style={styles.emptyTitle}>No entry for this day</Text>
            <Text style={styles.emptyDesc}>You hadn't opened the diary yet.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={isTyping ? (
              <View style={styles.messageRow}>
                <View style={[styles.aiAvatar, { backgroundColor: "#6366F1" }]}>
                  <Text style={styles.aiAvatarText}>R</Text>
                </View>
                <View style={[styles.bubble, { backgroundColor: "#12121C", borderColor: "#1E1E2E", borderWidth: 1 }]}>
                  <Text style={{ color: "#6B7280", fontSize: 20 }}>•••</Text>
                </View>
              </View>
            ) : null}
          />
        )}

        {/* ── Input (today only) ── */}
        {isToday ? (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
            <View style={[styles.inputRow, { backgroundColor: "#12121C", borderColor: "#1E1E2E" }]}>
              <TextInput
                style={[styles.input, { color: "#FFF" }]}
                placeholder="Write your thoughts..."
                placeholderTextColor="#6B7280"
                value={inputText}
                onChangeText={setInputText}
                multiline
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={!inputText.trim() || isTyping}
                style={[styles.sendBtn, { backgroundColor: inputText.trim() ? "#6366F1" : "#1A1A28" }]}
              >
                <Ionicons name="send" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View style={[styles.readOnlyBar, { borderColor: "#1E1E2E" }]}>
            <Ionicons name="lock-closed-outline" size={14} color="#6B7280" />
            <Text style={styles.readOnlyText}>Past entry — read only</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFF" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280" },
  moodBadge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  moodEmoji: { fontSize: 20 },

  dateStrip: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  dateChip: { alignItems: "center", borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, gap: 2, minWidth: 56 },
  dateChipDay: { fontSize: 11, fontFamily: "Inter_500Medium" },
  dateChipNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  entryDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },

  messageList: { padding: 16, gap: 16 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 },
  messageRowUser: { flexDirection: "row-reverse" },
  aiAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  aiAvatarText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" },
  bubble: { maxWidth: "78%", borderRadius: 18, padding: 14, gap: 4 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular" },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#6B7280" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#374151" },

  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, margin: 16, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100, paddingVertical: 4 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  readOnlyBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, margin: 16, borderTopWidth: 1, paddingTop: 12 },
  readOnlyText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280" },
});
