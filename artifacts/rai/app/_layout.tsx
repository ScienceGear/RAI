import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Ionicons, Feather } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { AppState } from "react-native";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { handleEmailLink } from "@/lib/auth";
import { areMandatoryPermissionsGranted } from "@/src/services/PermissionGateService";
import { useSegments } from "expo-router";

SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

function RootLayoutNav() {
  const { authUser, isAuthReady, profile } = useApp();
  const segments = useSegments();
  const onPermissionGate = segments[0] === "permissions-gate";

  // Handle incoming deep links for magic link sign-in
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      try {
        await handleEmailLink(url);
      } catch {}
    };

    const sub = Linking.addEventListener("url", handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !authUser || !profile.onboardingComplete) return;

    const run = async () => {
      const granted = await areMandatoryPermissionsGranted();
      if (!granted && !onPermissionGate) {
        router.replace("/permissions-gate");
        return;
      }
      if (granted && onPermissionGate) {
        router.replace("/(tabs)/home");
      }
    };

    void run();
  }, [authUser?.uid, isAuthReady, profile.onboardingComplete, onPermissionGate]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !isAuthReady || !authUser || !profile.onboardingComplete) return;
      void (async () => {
        const granted = await areMandatoryPermissionsGranted();
        if (!granted && !onPermissionGate) router.replace("/permissions-gate");
        if (granted && onPermissionGate) router.replace("/(tabs)/home");
      })();
    });
    return () => sub.remove();
  }, [authUser?.uid, isAuthReady, profile.onboardingComplete, onPermissionGate]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A0A0F" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ animation: "none" }} />
      <Stack.Screen name="auth/index" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="onboarding/index" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="onboarding/permissions" options={{ animation: "slide_from_right", gestureEnabled: false }} />
      <Stack.Screen name="permissions-gate" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
      <Stack.Screen name="focus/index" options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }} />
      <Stack.Screen name="diary/index" options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }} />
      <Stack.Screen name="goals/index" />
      <Stack.Screen name="achievements" />
      <Stack.Screen name="confidence" />
      <Stack.Screen name="anti-quit" />
      <Stack.Screen name="profile/index" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="blocker/index" options={{ animation: "slide_from_bottom", presentation: "fullScreenModal", gestureEnabled: false }} />
      <Stack.Screen name="lockscreen" options={{ animation: "fade", gestureEnabled: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="settings/app-blocker" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Ionicons.font,
    ...Feather.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
