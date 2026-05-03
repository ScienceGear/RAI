import { useEffect } from "react";
import { StyleSheet, Text, Image } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from "react-native-reanimated";

import { useApp } from "@/contexts/AppContext";

export default function SplashScreen() {
  const { profile, isLoaded, isAuthReady, firebaseUser } = useApp();

  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const glow = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + glow.value * 0.35,
  }));

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12 });
    opacity.value = withTiming(1, { duration: 700 });
    glow.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    const timer = setTimeout(() => {
      if (!firebaseUser) {
        router.replace("/auth");
      } else if (!profile.onboardingComplete) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)/home");
      }
    }, 2400);
    return () => clearTimeout(timer);
  }, [isAuthReady, isLoaded, firebaseUser, profile.onboardingComplete]);

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A", "#130A28"]} style={styles.container}>
      <Animated.View style={[styles.logoWrap, animStyle]}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>RAI</Text>
        <Text style={styles.tagline}>Your AI coach that never lets you quit.</Text>
      </Animated.View>

      <Animated.View
        style={[styles.loadingBar, { position: "absolute", bottom: 80 }]}
      >
        <Animated.View style={[styles.loadingFill, { width: isAuthReady ? "100%" : "55%" }]} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    gap: 18,
  },
  glow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#6366F1",
    top: -35,
    zIndex: -1,
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  logoText: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  loadingBar: {
    width: 120,
    height: 3,
    backgroundColor: "#1E1E2E",
    borderRadius: 2,
    overflow: "hidden",
  },
  loadingFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 2,
  },
});
