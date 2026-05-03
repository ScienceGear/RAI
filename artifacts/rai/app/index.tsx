import { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useApp } from "@/contexts/AppContext";

export default function SplashScreen() {
  const { profile, isLoaded } = useApp();

  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12 });
    opacity.value = withTiming(1, { duration: 600 });
    rotate.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      if (!profile.onboardingComplete) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)/home");
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [isLoaded, profile.onboardingComplete]);

  return (
    <LinearGradient
      colors={["#0A0A0F", "#0D0B1A", "#130A28"]}
      style={styles.container}
    >
      <Animated.View style={[styles.logoContainer, animStyle]}>
        <View style={styles.atomContainer}>
          <View style={styles.atomCore} />
          <Animated.View style={[styles.orbitRing, styles.orbit1, orbitStyle]}>
            <View style={styles.electron} />
          </Animated.View>
          <Animated.View style={[styles.orbitRing, styles.orbit2, { transform: [{ rotate: "60deg" }] }]}>
            <View style={styles.electron} />
          </Animated.View>
          <Animated.View style={[styles.orbitRing, styles.orbit3, { transform: [{ rotate: "120deg" }] }]}>
            <View style={styles.electron} />
          </Animated.View>
        </View>

        <Text style={styles.logoText}>RAI</Text>
        <Text style={styles.tagline}>Your AI coach that never lets you quit.</Text>
      </Animated.View>

      <View style={styles.loadingBar}>
        <Animated.View style={[styles.loadingFill, {
          width: isLoaded ? "100%" : "60%",
        }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
  },
  logoContainer: {
    alignItems: "center",
    gap: 20,
  },
  atomContainer: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  atomCore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#8B5CF6",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  orbitRing: {
    position: "absolute",
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: "#6366F150",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  orbit1: { width: 80, height: 80 },
  orbit2: { width: 100, height: 60 },
  orbit3: { width: 60, height: 100 },
  electron: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6366F1",
    marginLeft: -4,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
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
    position: "absolute",
    bottom: 80,
  },
  loadingFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 2,
  },
});
