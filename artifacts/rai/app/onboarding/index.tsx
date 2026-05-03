import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Animated, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { getDefaultEnergyProfile } from "@/lib/scheduler";
import { generateOnboardingSummary } from "@/lib/ai";
import { PrimaryFocus, Chronotype } from "@/types";

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const FOCUS_OPTIONS: { value: PrimaryFocus; label: string; desc: string }[] = [
  { value: "studying", label: "Studying / Exams", desc: "Courses, exams, research" },
  { value: "work", label: "Work / Career", desc: "Job, career growth" },
  { value: "freelancing", label: "Freelancing", desc: "Client projects, proposals" },
  { value: "building", label: "Building Something", desc: "Startup, side project" },
  { value: "health", label: "Health & Fitness", desc: "Gym, diet, wellness" },
  { value: "personal_growth", label: "Personal Growth", desc: "Habits, mindset, skills" },
  { value: "mixed", label: "All of the above", desc: "Multiple goals at once" },
];

const STRUGGLE_OPTIONS = [
  "Social media", "YouTube / video", "Gaming", "Getting started",
  "Staying consistent", "Burnout", "Poor sleep", "Procrastination",
];

const CHRONOTYPE_OPTIONS: { value: Chronotype; label: string; hours: string }[] = [
  { value: "morning", label: "Early morning", hours: "5–9 AM" },
  { value: "morning", label: "Morning", hours: "9 AM–12 PM" },
  { value: "intermediate", label: "Afternoon", hours: "12–5 PM" },
  { value: "intermediate", label: "Evening", hours: "5–9 PM" },
  { value: "evening", label: "Night", hours: "9 PM+" },
];

const MOTIVATION_OPTIONS = [
  "Proving people wrong", "Family / loved ones", "Financial freedom",
  "Passion for the work", "Fear of regret", "Competitive drive",
];

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateProfile } = useApp();

  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [focus, setFocus] = useState<PrimaryFocus>("mixed");
  const [goalType, setGoalType] = useState("");
  const [struggles, setStruggles] = useState<string[]>([]);
  const [chronotype, setChronotype] = useState<Chronotype>("morning");
  const [hours, setHours] = useState(4);
  const [motivation, setMotivation] = useState("");
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const totalSteps = 8;

  const animateForward = () => {
    slideAnim.setValue(300);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 18 }).start();
  };

  const next = async (nextStep?: Step) => {
    await Haptics.selectionAsync();
    const ns = nextStep !== undefined ? nextStep : (step + 1) as Step;

    if (ns === 7) {
      setLoadingSummary(true);
      const s = await generateOnboardingSummary({ name, focus, goalType, struggles, chronotype, hours, motivation });
      setSummary(s || `Welcome, ${name}! You're focused on ${focus} and ready to build powerful habits. Let's build your first perfect day together.`);
      setLoadingSummary(false);
    }

    animateForward();
    setStep(ns);
  };

  const handleFinish = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfile({
      name,
      firstName: name.split(" ")[0],
      primaryFocus: focus,
      goalType,
      mainStruggle: struggles,
      motivation,
      chronotype,
      dailyCapacityMinutes: hours * 60,
      energyProfile: getDefaultEnergyProfile(chronotype),
      onboardingComplete: true,
      preferredWorkHours: chronotype === "morning" ? ["06:00-12:00"] : chronotype === "evening" ? ["17:00-23:00"] : ["09:00-12:00", "16:00-19:00"],
    });
    router.replace("/onboarding/permissions");
  };

  const toggleStruggle = (s: string) => {
    setStruggles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: "#FFF" }]}>What's your name?</Text>
            <Text style={[styles.stepSubtitle, { color: "#6B7280" }]}>I'll personalize everything just for you.</Text>
            <TextInput
              style={[styles.nameInput, { color: "#FFF", borderColor: "#1E1E2E", backgroundColor: "#12121C" }]}
              placeholder="Your name..."
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => name.trim() && next()}
            />
            <TouchableOpacity
              onPress={() => name.trim() && next()}
              style={[styles.nextBtn, { backgroundColor: name.trim() ? "#6366F1" : "#1A1A28" }]}
              disabled={!name.trim()}
            >
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: "#FFF" }]}>What's your main focus?</Text>
            <Text style={[styles.stepSubtitle, { color: "#6B7280" }]}>RAI adapts to every goal type.</Text>
            <View style={styles.optionGrid}>
              {FOCUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value + opt.label}
                  onPress={() => { setFocus(opt.value); }}
                  style={[styles.optionCard, {
                    backgroundColor: focus === opt.value ? "#6366F133" : "#12121C",
                    borderColor: focus === opt.value ? "#6366F1" : "#1E1E2E",
                  }]}
                >
                  <Text style={[styles.optionLabel, { color: focus === opt.value ? "#818CF8" : "#FFF" }]}>{opt.label}</Text>
                  <Text style={[styles.optionDesc, { color: "#6B7280" }]}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => next()} style={[styles.nextBtn, { backgroundColor: "#6366F1" }]}>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: "#FFF" }]}>Tell me more</Text>
            <Text style={[styles.stepSubtitle, { color: "#6B7280" }]}>What are you working towards specifically?</Text>
            <TextInput
              style={[styles.nameInput, { color: "#FFF", borderColor: "#1E1E2E", backgroundColor: "#12121C" }]}
              placeholder="e.g. Launch my startup, Pass UPSC 2025..."
              placeholderTextColor="#6B7280"
              value={goalType}
              onChangeText={setGoalType}
              autoFocus
            />
            <TouchableOpacity onPress={() => next(3)} style={[styles.nextBtn, { backgroundColor: "#6366F1" }]}>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: "#FFF" }]}>What derails you most?</Text>
            <Text style={[styles.stepSubtitle, { color: "#6B7280" }]}>Select all that apply. RAI will watch for these.</Text>
            <View style={styles.tagGrid}>
              {STRUGGLE_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggleStruggle(s)}
                  style={[styles.tag, {
                    backgroundColor: struggles.includes(s) ? "#EF444422" : "#12121C",
                    borderColor: struggles.includes(s) ? "#EF4444" : "#1E1E2E",
                  }]}
                >
                  <Text style={[styles.tagText, { color: struggles.includes(s) ? "#EF4444" : "#9CA3AF" }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => next(4)} style={[styles.nextBtn, { backgroundColor: "#6366F1" }]}>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: "#FFF" }]}>When do you do your best work?</Text>
            <Text style={[styles.stepSubtitle, { color: "#6B7280" }]}>I'll schedule your hardest tasks here.</Text>
            <View style={styles.optionList}>
              {CHRONOTYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.hours}
                  onPress={() => setChronotype(opt.value)}
                  style={[styles.listOption, {
                    backgroundColor: chronotype === opt.value && opt.hours.includes(chronotype === "morning" ? "5" : chronotype === "evening" ? "9 PM" : "12") ? "#6366F133" : "#12121C",
                    borderColor: "#1E1E2E",
                  }]}
                >
                  <Text style={[styles.listOptionLabel, { color: "#FFF" }]}>{opt.label}</Text>
                  <Text style={[styles.listOptionHours, { color: "#6B7280" }]}>{opt.hours}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => next(5)} style={[styles.nextBtn, { backgroundColor: "#6366F1" }]}>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: "#FFF" }]}>How many hours can you commit?</Text>
            <Text style={[styles.stepSubtitle, { color: "#6B7280" }]}>Be realistic — I'll protect you from overloading.</Text>
            <View style={styles.sliderContainer}>
              <Text style={[styles.hoursDisplay, { color: "#6366F1" }]}>{hours}h</Text>
              <Text style={[styles.hoursLabel, { color: "#6B7280" }]}>per day</Text>
              <View style={styles.hoursBtns}>
                {[2, 3, 4, 5, 6, 8, 10, 12].map((h) => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => setHours(h)}
                    style={[styles.hourBtn, {
                      backgroundColor: hours === h ? "#6366F1" : "#12121C",
                      borderColor: hours === h ? "#6366F1" : "#1E1E2E",
                    }]}
                  >
                    <Text style={[styles.hourBtnText, { color: hours === h ? "#FFF" : "#6B7280" }]}>{h}h</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity onPress={() => next(6)} style={[styles.nextBtn, { backgroundColor: "#6366F1" }]}>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: "#FFF" }]}>What keeps you going?</Text>
            <Text style={[styles.stepSubtitle, { color: "#6B7280" }]}>I'll tailor my motivation messages to this.</Text>
            <View style={styles.optionList}>
              {MOTIVATION_OPTIONS.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMotivation(m)}
                  style={[styles.listOption, {
                    backgroundColor: motivation === m ? "#6366F133" : "#12121C",
                    borderColor: motivation === m ? "#6366F1" : "#1E1E2E",
                  }]}
                >
                  <Text style={[styles.listOptionLabel, { color: motivation === m ? "#818CF8" : "#FFF" }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => motivation && next(7)}
              style={[styles.nextBtn, { backgroundColor: motivation ? "#6366F1" : "#1A1A28" }]}
              disabled={!motivation}
            >
              <Text style={styles.nextBtnText}>Build my profile</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        );

      case 7:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.completionIcon}>
              <Text style={{ fontSize: 48 }}>✨</Text>
            </View>
            <Text style={[styles.stepTitle, { color: "#FFF" }]}>Your AI profile is ready</Text>
            {loadingSummary ? (
              <Text style={[styles.summaryText, { color: "#6B7280" }]}>RAI is analyzing your profile...</Text>
            ) : (
              <Text style={[styles.summaryText, { color: "#D1D5DB" }]}>{summary}</Text>
            )}
            <View style={[styles.potentialCard, { backgroundColor: "#6366F111", borderColor: "#6366F133" }]}>
              <Text style={[styles.potentialLabel, { color: "#818CF8" }]}>Your productivity potential</Text>
              <Text style={[styles.potentialValue, { color: "#FFF" }]}>{hours} focused hours / day</Text>
            </View>
            <TouchableOpacity
              onPress={handleFinish}
              style={[styles.nextBtn, { backgroundColor: "#6366F1" }]}
              disabled={loadingSummary}
            >
              <Text style={styles.nextBtnText}>Build my first day</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        );
    }
  };

  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 20 : 44);

  return (
    <LinearGradient colors={["#0A0A0F", "#0D0B1A", "#130A28"]} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          {step > 0 && step < 7 && (
            <TouchableOpacity onPress={() => setStep((s) => (s - 1) as Step)}>
              <Ionicons name="arrow-back" size={22} color="#6B7280" />
            </TouchableOpacity>
          )}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((step + 1) / totalSteps) * 100}%` }]} />
          </View>
          <Text style={[styles.stepCounter, { color: "#6B7280" }]}>{step + 1}/{totalSteps}</Text>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
              {renderStep()}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 },
  progressBar: { flex: 1, height: 3, backgroundColor: "#1E1E2E", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#6366F1", borderRadius: 2 },
  stepCounter: { fontSize: 13, fontFamily: "Inter_500Medium" },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  stepContainer: { gap: 20 },
  stepTitle: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 36, marginTop: 8 },
  stepSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginTop: -12 },
  nameInput: { borderRadius: 14, borderWidth: 1, padding: 16, fontSize: 18, fontFamily: "Inter_400Regular", height: 56 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16 },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  optionGrid: { gap: 10 },
  optionCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  optionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  optionDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  tagGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tag: { borderRadius: 100, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  tagText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  optionList: { gap: 10 },
  listOption: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listOptionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  listOptionHours: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sliderContainer: { alignItems: "center", gap: 12 },
  hoursDisplay: { fontSize: 64, fontFamily: "Inter_700Bold" },
  hoursLabel: { fontSize: 16, fontFamily: "Inter_400Regular", marginTop: -16 },
  hoursBtns: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  hourBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 10, minWidth: 56, alignItems: "center" },
  hourBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  completionIcon: { alignItems: "center", marginVertical: 8 },
  summaryText: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 26, textAlign: "center" },
  potentialCard: { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: "center", gap: 6 },
  potentialLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  potentialValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
});
