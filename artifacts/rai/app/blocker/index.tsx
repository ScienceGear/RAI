import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Animated, Platform, BackHandler, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { AppBlocker } from "@/modules/app-blocker";

type Screen = "gate" | "text" | "countdown";

const GRACE_MINUTES = 5;

export default function BlockerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { app: packageName, name: appName } = useLocalSearchParams<{ app: string; name: string }>();

  const [screen, setScreen] = useState<Screen>("gate");
  const [commitment, setCommitment] = useState("");
  const [countdown, setCountdown] = useState(GRACE_MINUTES * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    // Prevent back button from bypassing the blocker
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (screen === "countdown") {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            void AppBlocker.addGracePeriod(packageName ?? "", GRACE_MINUTES);
            router.back();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [screen]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleGiveMeFive = () => {
    void AppBlocker.addGracePeriod(packageName ?? "", GRACE_MINUTES);
    setScreen("countdown");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleCommit = () => {
    if (commitment.trim().length < 10) { shake(); return; }
    Keyboard.dismiss();
    void AppBlocker.addGracePeriod(packageName ?? "", GRACE_MINUTES);
    setScreen("countdown");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const progress = countdown / (GRACE_MINUTES * 60);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {screen === "gate" && (
        <Animated.View style={[styles.content, { transform: [{ translateX: shakeAnim }], paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
          {/* Shield icon */}
          <View style={styles.iconRing}>
            <Ionicons name="shield-checkmark" size={52} color="#6366F1" />
          </View>

          <Text style={styles.title}>Hold on.</Text>
          <Text style={styles.appName}>{appName ?? "This app"}</Text>
          <Text style={styles.subtitle}>
            You blocked this app to stay focused.{"\n"}What do you actually need it for right now?
          </Text>

          {/* Text commitment */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setScreen("text")}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>Write a commitment</Text>
          </TouchableOpacity>

          {/* 5 min override */}
          <TouchableOpacity style={styles.graceBtn} onPress={handleGiveMeFive} activeOpacity={0.7}>
            <Ionicons name="timer-outline" size={16} color="#9CA3AF" />
            <Text style={styles.graceBtnText}>Give me 5 minutes</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            ✦ Logging this moment builds self-awareness over time
          </Text>
        </Animated.View>
      )}

      {screen === "text" && (
        <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity onPress={() => setScreen("gate")} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.iconRing}>
            <Ionicons name="create" size={44} color="#6366F1" />
          </View>
          <Text style={styles.title}>Why are you opening {appName}?</Text>
          <Text style={styles.subtitle}>Be honest — this is just for you.</Text>

          <TextInput
            style={styles.textInput}
            placeholder="e.g. checking a message from a friend about the project..."
            placeholderTextColor="#4B5563"
            multiline
            value={commitment}
            onChangeText={setCommitment}
            maxLength={280}
            autoFocus
          />
          <Text style={styles.charCount}>{commitment.length}/280 — min 10 chars</Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { opacity: commitment.trim().length >= 10 ? 1 : 0.5 }]}
            onPress={handleCommit}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>Submit &amp; unlock for 5 min</Text>
          </TouchableOpacity>
        </View>
      )}

      {screen === "countdown" && (
        <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.countdownRing}>
            <Text style={styles.countdownTime}>{display}</Text>
            <Text style={styles.countdownLabel}>until block re-engages</Text>
          </View>

          <Text style={styles.title}>{appName} unlocked</Text>
          <Text style={styles.subtitle}>
            Use this time intentionally.{"\n"}RAI will re-block when the timer ends.
          </Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <TouchableOpacity
            onPress={() => {
              clearInterval(intervalRef.current!);
              router.back();
            }}
            style={styles.graceBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={16} color="#9CA3AF" />
            <Text style={styles.graceBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080810",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 16,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  iconRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#6366F122",
    borderWidth: 1.5,
    borderColor: "#6366F144",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    textAlign: "center",
  },
  appName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#6366F1",
    textAlign: "center",
    marginTop: -8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#6366F1",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  graceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E1E2E",
  },
  graceBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#6B7280",
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#374151",
    textAlign: "center",
    marginTop: "auto",
  },
  textInput: {
    width: "100%",
    backgroundColor: "#0F0F1A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E2E",
    color: "#FFF",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    padding: 16,
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#4B5563",
    alignSelf: "flex-end",
    marginTop: -8,
  },
  countdownRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#6366F111",
    borderWidth: 2,
    borderColor: "#6366F144",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 16,
  },
  countdownTime: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: -2,
  },
  countdownLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
  },
  progressTrack: {
    alignSelf: "stretch",
    height: 4,
    backgroundColor: "#1E1E2E",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 2,
  },
});
