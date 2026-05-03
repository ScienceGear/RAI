import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Animated, Pressable, Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";

const MOODS = [
  { value: 1 as const, emoji: "😩", label: "Drained" },
  { value: 2 as const, emoji: "😕", label: "Low" },
  { value: 3 as const, emoji: "😐", label: "Okay" },
  { value: 4 as const, emoji: "😊", label: "Good" },
  { value: 5 as const, emoji: "🔥", label: "Amazing" },
];

const TAGS = [
  "energized", "tired", "focused", "distracted",
  "proud", "stressed", "calm", "motivated",
];

interface Props {
  visible: boolean;
  taskTitle?: string;
  onClose: () => void;
}

export function MoodCheckInModal({ visible, taskTitle, onClose }: Props) {
  const colors = useColors();
  const { logMood } = useApp();
  const [selectedMood, setSelectedMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSelectedMood(null);
      setSelectedTags([]);
      setSubmitted(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const toggleTag = async (tag: string) => {
    await Haptics.selectionAsync();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleMoodSelect = async (value: 1 | 2 | 3 | 4 | 5) => {
    await Haptics.selectionAsync();
    setSelectedMood(value);
  };

  const handleSubmit = async () => {
    if (!selectedMood) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitted(true);
    await logMood(selectedMood, selectedTags);
    setTimeout(onClose, 900);
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleSkip} />
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {submitted ? (
            <View style={styles.successState}>
              <Text style={styles.successEmoji}>
                {MOODS.find((m) => m.value === selectedMood)?.emoji ?? "✨"}
              </Text>
              <Text style={[styles.successText, { color: colors.foreground }]}>Logged!</Text>
              <Text style={[styles.successSub, { color: colors.mutedForeground }]}>RAI will factor this in</Text>
            </View>
          ) : (
            <>
              <View style={styles.handle} />

              <Text style={[styles.title, { color: colors.foreground }]}>How are you feeling?</Text>
              {taskTitle ? (
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                  after completing "{taskTitle}"
                </Text>
              ) : (
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  after your session
                </Text>
              )}

              <View style={styles.moodRow}>
                {MOODS.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => handleMoodSelect(m.value)}
                    style={[
                      styles.moodBtn,
                      {
                        backgroundColor: selectedMood === m.value
                          ? colors.primary + "22"
                          : colors.secondary,
                        borderColor: selectedMood === m.value
                          ? colors.primary
                          : colors.border,
                        transform: [{ scale: selectedMood === m.value ? 1.08 : 1 }],
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, {
                      color: selectedMood === m.value ? colors.primary : colors.mutedForeground,
                    }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedMood !== null && (
                <>
                  <Text style={[styles.tagsTitle, { color: colors.mutedForeground }]}>Any tags?</Text>
                  <View style={styles.tagsRow}>
                    {TAGS.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => toggleTag(tag)}
                        style={[
                          styles.tagChip,
                          {
                            backgroundColor: selectedTags.includes(tag)
                              ? colors.primary + "22"
                              : colors.secondary,
                            borderColor: selectedTags.includes(tag)
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.tagText, {
                          color: selectedTags.includes(tag) ? colors.primary : colors.mutedForeground,
                        }]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.actions}>
                <TouchableOpacity onPress={handleSkip} style={[styles.skipBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!selectedMood}
                  style={[styles.logBtn, {
                    backgroundColor: selectedMood ? colors.primary : colors.secondary,
                    opacity: selectedMood ? 1 : 0.5,
                  }]}
                >
                  <Text style={styles.logBtnText}>Log mood</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000080",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 12,
    gap: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF33",
    alignSelf: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: -8,
  },
  moodRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  moodBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  tagsTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: -6,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  skipBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  logBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  logBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  successState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 6,
  },
  successEmoji: {
    fontSize: 48,
  },
  successText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  successSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
