import { useColorScheme } from "react-native";
import { useContext } from "react";

import colors from "@/constants/colors";
import { AppContext } from "@/contexts/AppContext";

export function useColors() {
  const scheme = useColorScheme();
  const ctx = useContext(AppContext);
  const theme = ctx?.profile?.theme ?? "dark";

  let isDark: boolean;
  if (theme === "system") {
    isDark = scheme === "dark";
  } else {
    isDark = theme === "dark" || theme === "amoled";
  }

  const palette = isDark ? colors.dark : colors.light;

  const base = { ...palette, radius: colors.radius };

  if (theme === "amoled") {
    return { ...base, background: "#000000", card: "#0A0A0F" };
  }
  return base;
}
