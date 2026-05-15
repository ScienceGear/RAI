import React, { useEffect } from "react";
import { BackHandler, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

export default function LockScreen() {
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Critical distraction risk</Text>
      <Text style={styles.subtitle}>RAI locked your flow. Choose a productive action to continue.</Text>

      <TouchableOpacity style={styles.primary} onPress={() => router.replace("/focus")}>
        <Text style={styles.primaryText}>Start Focus Session</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondary} onPress={() => router.replace("/(tabs)/tasks")}>
        <Text style={styles.secondaryText}>Complete Task</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080A12",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFF", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
  primary: { width: "100%", borderRadius: 14, backgroundColor: "#4F46E5", paddingVertical: 14, alignItems: "center", marginTop: 10 },
  primaryText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 16 },
  secondary: { width: "100%", borderRadius: 14, borderWidth: 1, borderColor: "#374151", paddingVertical: 14, alignItems: "center" },
  secondaryText: { color: "#D1D5DB", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
