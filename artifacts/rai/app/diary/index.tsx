import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, SafeAreaView,
} from "react-native";
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

export default function DiaryScreen() {
  const colors = useColors();
  const { profile, diary, addDiaryEntry, updateDiaryEntry, moodLogs, todayFocusScore } = useApp();

  const today = new Date().toISOString().split("T")[0];
  const todayEntry = diary.find((d) => d.date === today);

  const [messages, setMessages] = useState<DiaryMessage[]>(
    todayEntry?.messages ?? [{
      id: genId(),
      role: "assistant",
      content: `How was your day, ${profile.firstName}? What was the hardest moment?`,
      timestamp: new Date().toISOString(),
    }]
  );
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const recentMood = moodLogs[0]?.mood ?? 3;

  const sendMessage = useCallback(async () => {
    if (!inputText.trim()) return;
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

    const entryId = todayEntry?.id ?? genId();

    if (!todayEntry) {
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
  }, [inputText, messages, profile, todayFocusScore, recentMood]);

  const renderMessage = ({ item }: { item: DiaryMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.aiAvatarText}>R</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? {
          backgroundColor: colors.primary,
          borderBottomRightRadius: 4,
        } : {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderBottomLeftRadius: 4,
        }]}>
          <Text style={[styles.bubbleText, { color: isUser ? "#FFF" : colors.foreground }]}>
            {item.content}
          </Text>
          <Text style={[styles.bubbleTime, { color: isUser ? "#FFFFFF88" : colors.mutedForeground }]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>RAI Diary</Text>
            <Text style={styles.headerSub}>{new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</Text>
          </View>
          <View style={[styles.moodBadge, { backgroundColor: "#6366F122" }]}>
            <Text style={styles.moodEmoji}>{["😫", "😟", "😐", "🙂", "🤩"][recentMood - 1]}</Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isTyping ? (
            <View style={[styles.messageRow]}>
              <View style={[styles.aiAvatar, { backgroundColor: "#6366F1" }]}>
                <Text style={styles.aiAvatarText}>R</Text>
              </View>
              <View style={[styles.bubble, { backgroundColor: "#12121C", borderColor: "#1E1E2E", borderWidth: 1 }]}>
                <Text style={{ color: "#6B7280", fontSize: 20 }}>•••</Text>
              </View>
            </View>
          ) : null}
        />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
          <View style={[styles.inputRow, { backgroundColor: "#12121C", borderColor: "#1E1E2E" }]}>
            <TextInput
              style={[styles.input, { color: "#FFF" }]}
              placeholder="Write or speak your thoughts..."
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
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFF" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280" },
  moodBadge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  moodEmoji: { fontSize: 20 },
  messageList: { padding: 16, gap: 16 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 },
  messageRowUser: { flexDirection: "row-reverse" },
  aiAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  aiAvatarText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" },
  bubble: { maxWidth: "78%", borderRadius: 18, padding: 14, gap: 4 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, margin: 16, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100, paddingVertical: 4 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
