import React, { useEffect } from "react";
import { View, StyleSheet, Modal, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

interface SwipeableSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backgroundColor: string;
  handleColor: string;
  maxHeight?: number | `${number}%`;
  backdropOpacity?: number;
}

export function SwipeableSheet({
  visible,
  onClose,
  children,
  backgroundColor,
  handleColor,
  maxHeight = "85%",
  backdropOpacity = 0.6,
}: SwipeableSheetProps) {
  const translateY = useSharedValue(800);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
    } else {
      translateY.value = 800;
    }
  }, [visible]);

  const dismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      "worklet";
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      "worklet";
      if (e.translationY > 80 || e.velocityY > 700) {
        translateY.value = withSpring(800, { damping: 20 }, () => runOnJS(dismiss)());
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: `rgba(0,0,0,${backdropOpacity})` }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismiss} />
        <Animated.View style={[styles.sheet, { backgroundColor, maxHeight: maxHeight as any }, animStyle]}>
          <GestureDetector gesture={pan}>
            <View style={styles.handleArea}>
              <View style={[styles.pill, { backgroundColor: handleColor }]} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handleArea: { paddingTop: 12, paddingBottom: 4, alignItems: "center" },
  pill: { width: 36, height: 4, borderRadius: 2 },
});
