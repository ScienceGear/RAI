import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { signIn, signUp, listenToAuthState } from "@/lib/auth";

type Mode = "login" | "register";

const DEMO_EMAIL = "demo2@rai.app";
const DEMO_PASSWORD = "demo123456";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If already signed in, skip auth
  useEffect(() => {
    const unsub = listenToAuthState((user) => {
      if (user) router.replace("/(tabs)/home");
    });
    return unsub;
  }, []);

  const clearError = () => setError("");

  const handleSubmit = async () => {
    const trimEmail = email.trim().toLowerCase();
    const trimPassword = password;

    if (!trimEmail || !trimEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (trimPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("Enter your name.");
      return;
    }

    setLoading(true);
    setError("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (mode === "login") {
        await signIn(trimEmail, trimPassword);
      } else {
        await signUp(trimEmail, trimPassword, name.trim());
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(mode === "register" ? "/onboarding" : "/(tabs)/home");
    } catch (e: unknown) {
      const code = typeof e === "object" && e !== null && "code" in e && typeof (e as { code?: unknown }).code === "string"
        ? (e as { code: string }).code
        : "";
      const message = typeof e === "object" && e !== null && "message" in e && typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "";
      const normalized = `${code} ${message}`.toLowerCase();

      if (
        normalized.includes("user-not-found") ||
        normalized.includes("wrong-password") ||
        normalized.includes("invalid-credential") ||
        normalized.includes("invalid_credentials") ||
        normalized.includes("invalid login credentials")
      ) {
        setError("Incorrect email or password.");
      } else if (normalized.includes("email-already-in-use") || normalized.includes("user already registered")) {
        setError("An account with this email already exists. Sign in instead.");
      } else if (normalized.includes("weak-password")) {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (normalized.includes("invalid-email")) {
        setError("Invalid email address.");
      } else if (normalized.includes("email not confirmed")) {
        setError("Check your inbox and confirm your email, then try again.");
      } else if (
        normalized.includes("network request failed") ||
        normalized.includes("failed to fetch") ||
        normalized.includes("networkerror")
      ) {
        setError("Can't reach Supabase right now. Check internet and Supabase URL/key config.");
      } else {
        setError("Failed to sign in. Check your connection and try again.");
      }
      console.warn("auth submit error:", e);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError("");
    setPassword("");
  };

  const useDemoAccount = () => {
    setMode("login");
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
  };

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A", "#130A28"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image source={require("@/assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
            <Text style={styles.appName}>RAI</Text>
            <Text style={styles.tagline}>Your AI coach that never lets you quit.</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{mode === "login" ? "Welcome back" : "Create account"}</Text>
            <Text style={styles.cardSubtitle}>
              {mode === "login" ? "Sign in to sync your progress across devices." : "Start your productivity journey with RAI."}
            </Text>

            {/* Name field (register only) */}
            {mode === "register" && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Your name</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={17} color="#6B7280" />
                  <TextInput
                    value={name}
                    onChangeText={(t) => { setName(t); clearError(); }}
                    placeholder="e.g. Alex"
                    placeholderTextColor="#4B5563"
                    autoCapitalize="words"
                    style={styles.input}
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={17} color="#6B7280" />
                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t); clearError(); }}
                  placeholder="your@email.com"
                  placeholderTextColor="#4B5563"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={17} color="#6B7280" />
                <TextInput
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearError(); }}
                  placeholder={mode === "register" ? "min. 6 characters" : "your password"}
                  placeholderTextColor="#4B5563"
                  secureTextEntry={!showPassword}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  style={[styles.input, { flex: 1 }]}
                  editable={!loading}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={17} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.submitBtn, { opacity: loading ? 0.7 : 1 }]}
            >
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {loading ? (
                  <Text style={styles.submitText}>Please wait...</Text>
                ) : (
                  <>
                    <Ionicons name={mode === "login" ? "log-in-outline" : "person-add-outline"} size={18} color="#FFF" />
                    <Text style={styles.submitText}>{mode === "login" ? "Sign In" : "Create Account"}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={useDemoAccount} disabled={loading} style={styles.demoBtn}>
              <Text style={styles.demoBtnText}>Use Demo Account</Text>
            </TouchableOpacity>
            <Text style={styles.demoHint}>Email: {DEMO_EMAIL}   Password: {DEMO_PASSWORD}</Text>

            {/* Toggle mode */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
              </Text>
              <TouchableOpacity onPress={toggleMode} disabled={loading}>
                <Text style={styles.toggleBtn}>{mode === "login" ? "Register" : "Sign In"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 28,
  },
  logoWrap: {
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  appName: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#12121C",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1E1E2E",
    padding: 24,
    gap: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    lineHeight: 20,
    marginTop: -6,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#9CA3AF",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A0A0F",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2D2D3F",
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#FFF",
    height: "100%",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EF444415",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EF444430",
    padding: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#EF4444",
    flex: 1,
    lineHeight: 18,
  },
  submitBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
  },
  demoBtn: {
    borderWidth: 1,
    borderColor: "#2D2D3F",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0A0F",
  },
  demoBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#A5B4FC",
  },
  demoHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    textAlign: "center",
    marginTop: -4,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  toggleLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
  },
  toggleBtn: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#6366F1",
  },
});
