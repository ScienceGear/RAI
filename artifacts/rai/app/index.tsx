import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useApp } from "@/contexts/AppContext";

const ease = Easing.out(Easing.cubic);

export default function SplashScreen() {
  const { profile, isLoaded, isAuthReady, firebaseUser } = useApp();

  const contentOpacity = useSharedValue(0);
  const contentY = useSharedValue(14);
  const taglineOpacity = useSharedValue(0);
  const barFill = useSharedValue(0);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${barFill.value}%` as any,
  }));

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 550, easing: ease });
    contentY.value = withTiming(0, { duration: 550, easing: ease });
    taglineOpacity.value = withDelay(280, withTiming(1, { duration: 500, easing: ease }));
    barFill.value = withDelay(150, withTiming(45, { duration: 700, easing: ease }));
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    barFill.value = withTiming(100, { duration: 350, easing: ease });
    const timer = setTimeout(() => {
      if (!firebaseUser) {
        router.replace("/auth");
      } else if (!profile.onboardingComplete) {
        router.replace("/onboarding");
      } else if (!profile.permissionsRequested) {
        // Show permissions for both new and existing users who haven't gone through it
        router.replace("/onboarding/permissions");
      } else {
        router.replace("/(tabs)/home");
      }
    }, 1600);
    return () => clearTimeout(timer);
  }, [isAuthReady, isLoaded, firebaseUser, profile.onboardingComplete]);

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A"]} style={styles.container}>
      <Animated.View style={[styles.centerBlock, contentStyle]}>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>AI PRODUCTIVITY COACH</Text>
        </View>
        <Text style={styles.wordmark}>RAI</Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Your AI coach that never lets you quit.
        </Animated.Text>
      </Animated.View>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBlock: {
    alignItems: "center",
    gap: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: "#6366F118",
    borderWidth: 1,
    borderColor: "#6366F130",
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6366F1",
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#818CF8",
    letterSpacing: 1.5,
  },
  wordmark: {
    fontSize: 72,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 18,
    marginLeft: 18,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#4B5563",
    letterSpacing: 0.2,
  },
  barTrack: {
    position: "absolute",
    bottom: 64,
    width: 140,
    height: 2,
    backgroundColor: "#1E1E2E",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 2,
  },
});
