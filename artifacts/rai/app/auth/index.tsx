import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Image, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useAuthRequest, makeRedirectUri } from "expo-auth-session";
import { router } from "expo-router";

import { sendMagicLink, signInWithGoogleCredential, getStoredEmail } from "@/lib/auth";
import { listenToAuthState } from "@/lib/auth";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = "593785131539-bd2obj39lgdd92rj1p29m4f3181gsbcs.apps.googleusercontent.com";

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

type State = "idle" | "sending" | "sent" | "googleLoading" | "error";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [storedEmail, setStoredEmail] = useState<string | null>(null);

  const redirectUri = makeRedirectUri({ scheme: "rai", path: "google-auth" });
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID,
      redirectUri,
      scopes: ["openid", "profile", "email"],
      responseType: "id_token",
      usePKCE: false,
      extraParams: { nonce: Math.random().toString(36).substring(2) },
    },
    GOOGLE_DISCOVERY
  );

  // If already authed, go home
  useEffect(() => {
    const unsub = listenToAuthState((user) => {
      if (user) router.replace("/(tabs)/home");
    });
    return unsub;
  }, []);

  // Check for stored email (magic link return)
  useEffect(() => {
    getStoredEmail().then(setStoredEmail);
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params?.id_token ?? (response as any).authentication?.idToken;
      if (idToken) {
        setState("googleLoading");
        signInWithGoogleCredential(idToken)
          .then(() => router.replace("/(tabs)/home"))
          .catch((e) => {
            setErrorMsg(e.message ?? "Google sign-in failed.");
            setState("error");
          });
      }
    } else if (response?.type === "error") {
      setErrorMsg("Google sign-in was cancelled or failed.");
      setState("error");
    }
  }, [response]);

  const handleSendMagicLink = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMsg("Enter a valid email address.");
      setState("error");
      return;
    }
    setState("sending");
    setErrorMsg("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await sendMagicLink(trimmedEmail);
      setState("sent");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setErrorMsg(e.message ?? "Failed to send link. Check your email and try again.");
      setState("error");
    }
  };

  const handleGoogleSignIn = async () => {
    await Haptics.selectionAsync();
    setState("googleLoading");
    setErrorMsg("");
    try {
      await promptAsync();
    } catch {
      setState("idle");
    }
  };

  const isLoading = state === "sending" || state === "googleLoading";

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A", "#130A28"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>RAI</Text>
            <Text style={styles.tagline}>Your AI coach that never lets you quit.</Text>
          </View>

          {state === "sent" ? (
            <View style={styles.sentBox}>
              <View style={styles.sentIcon}>
                <Ionicons name="mail" size={40} color="#6366F1" />
              </View>
              <Text style={styles.sentTitle}>Check your inbox!</Text>
              <Text style={styles.sentSubtitle}>
                We sent a magic link to{"\n"}
                <Text style={{ color: "#A5B4FC" }}>{email}</Text>
              </Text>
              <Text style={styles.sentNote}>
                Tap the link in your email to sign in. It expires in 1 hour.
              </Text>
              <TouchableOpacity
                onPress={() => { setState("idle"); setEmail(""); }}
                style={styles.retryBtn}
              >
                <Text style={styles.retryText}>Wrong email? Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Sign in to sync your progress</Text>
              <Text style={styles.formSubtitle}>All your tasks, streaks, and achievements across devices.</Text>

              {/* Email */}
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (state === "error") setState("idle"); }}
                  placeholder="your@email.com"
                  placeholderTextColor="#4B5563"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                  editable={!isLoading}
                  onSubmitEditing={handleSendMagicLink}
                  returnKeyType="send"
                />
              </View>

              {state === "error" && errorMsg ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Magic link button */}
              <TouchableOpacity
                onPress={handleSendMagicLink}
                disabled={isLoading}
                style={[styles.primaryBtn, { opacity: isLoading ? 0.7 : 1 }]}
              >
                <LinearGradient
                  colors={["#6366F1", "#8B5CF6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  <Ionicons
                    name={state === "sending" ? "hourglass-outline" : "sparkles-outline"}
                    size={18}
                    color="#FFF"
                  />
                  <Text style={styles.primaryBtnText}>
                    {state === "sending" ? "Sending..." : "Send Magic Link"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google button */}
              <TouchableOpacity
                onPress={handleGoogleSignIn}
                disabled={isLoading || !request}
                style={[styles.googleBtn, { opacity: (isLoading || !request) ? 0.6 : 1 }]}
              >
                <View style={styles.googleIcon}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.googleBtnText}>
                  {state === "googleLoading" ? "Connecting..." : "Continue with Google"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.legalText}>
                By signing in, you agree to our Terms of Service. Your data is stored securely in Firebase.
              </Text>
            </View>
          )}
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
    gap: 32,
  },
  logoWrap: {
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  appName: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  form: {
    width: "100%",
    gap: 14,
  },
  formTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    textAlign: "center",
  },
  formSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12121C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E2E",
    paddingHorizontal: 14,
    height: 54,
    gap: 10,
  },
  inputIcon: { },
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
    marginTop: -4,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#EF4444",
    flex: 1,
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  primaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1E1E2E",
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#4B5563",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#111827",
  },
  legalText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#374151",
    textAlign: "center",
    lineHeight: 17,
    marginTop: 4,
  },
  sentBox: {
    width: "100%",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#12121C",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1E1E2E",
    padding: 32,
  },
  sentIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6366F122",
    alignItems: "center",
    justifyContent: "center",
  },
  sentTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  sentSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 24,
  },
  sentNote: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#6366F1",
  },
});
