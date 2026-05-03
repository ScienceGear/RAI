import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  onLog?: (mood: number) => void;
}

const MOOD_OPTIONS = [
  { value: 1, emoji: "😫", label: "Struggling" },
  { value: 2, emoji: "😟", label: "Not great" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "🤩", label: "Great" },
];

const MOOD_TAGS = [
  "Tired", "Stressed", "Distracted", "Fine", "Excited", "Anxious", "Focused", "Burnt out", "Motivated", "Calm"
];

export function MoodCheckIn({ visible, onClose, onLog }: Props) {
  const colors = useColors();
  const { logMood } = useApp();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [step, setStep] = useState<"mood" | "tags" | "done">("mood");

  const handleMoodSelect = async (val: number) => {
    await Haptics.selectionAsync();
    setSelectedMood(val);
    setStep("tags");
  };

  const toggleTag = async (tag: string) => {
    await Haptics.selectionAsync();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!selectedMood) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await logMood(selectedMood, selectedTags);
    onLog?.(selectedMood);
    setStep("done");
    setTimeout(() => {
      onClose();
      setSelectedMood(null);
      setSelectedTags([]);
      setStep("mood");
    }, 1200);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {step === "done" ? (
            <View style={styles.doneState}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              <Text style={[styles.doneText, { color: colors.foreground }]}>Logged! +10 XP</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {step === "mood" ? "How are you feeling?" : "Why? (optional)"}
              </Text>

              {step === "mood" && (
                <View style={styles.moodRow}>
                  {MOOD_OPTIONS.map((m) => (
                    <TouchableOpacity
                      key={m.value}
                      onPress={() => handleMoodSelect(m.value)}
                      style={[styles.moodBtn, selectedMood === m.value && { backgroundColor: colors.primary + "33" }]}
                    >
                      <Text style={styles.moodEmoji}>{m.emoji}</Text>
                      <Text style={[styles.moodLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {step === "tags" && (
                <>
                  <View style={styles.tagsGrid}>
                    {MOOD_TAGS.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => toggleTag(tag)}
                        style={[styles.tag, {
                          backgroundColor: selectedTags.includes(tag) ? colors.primary : colors.secondary,
                          borderColor: selectedTags.includes(tag) ? colors.primary : colors.border,
                        }]}
                      >
                        <Text style={[styles.tagText, { color: selectedTags.includes(tag) ? "#FFF" : colors.mutedForeground }]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={handleSubmit}
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.submitText}>Done</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: 24 },
  card: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  moodRow: { flexDirection: "row", justifyContent: "space-around" },
  moodBtn: { alignItems: "center", gap: 4, padding: 10, borderRadius: 12 },
  moodEmoji: { fontSize: 32 },
  moodLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { borderRadius: 100, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  tagText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  submitText: { color: "#FFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  doneState: { alignItems: "center", gap: 12, paddingVertical: 16 },
  doneText: { fontSize: 18, fontFamily: "Inter_700Bold" },
});
