import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { getCategoryColor } from "@/constants/categories";

interface Props {
  category: string;
  size?: "sm" | "md";
}

export function CategoryChip({ category, size = "sm" }: Props) {
  const isDark = useColorScheme() === "dark";
  const color = getCategoryColor(category, isDark);
  const isSmall = size === "sm";

  return (
    <View style={[styles.chip, {
      backgroundColor: color + "22",
      borderColor: color + "55",
      paddingHorizontal: isSmall ? 8 : 12,
      paddingVertical: isSmall ? 2 : 4,
    }]}>
      <Text style={[styles.label, {
        color,
        fontSize: isSmall ? 11 : 13,
      }]}>
        {category}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 100,
    borderWidth: 1,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
