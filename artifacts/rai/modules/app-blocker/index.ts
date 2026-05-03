/**
 * Android App Blocker native module.
 * Requires Accessibility Service permission on device.
 * Falls back to no-ops in Expo Go / web.
 */
import { Platform } from "react-native";

export interface BlockedApp {
  packageName: string;
  appName: string;
}

let NativeAppBlocker: any = null;
try {
  const { requireNativeModule } = require("expo-modules-core");
  NativeAppBlocker = requireNativeModule("AppBlocker");
} catch {
  // Expo Go or web — no native module
}

const isAvailable = Platform.OS === "android" && NativeAppBlocker !== null;

export const AppBlocker = {
  isAvailable(): boolean {
    return isAvailable;
  },

  isServiceEnabled(): boolean {
    if (!isAvailable) return false;
    try { return NativeAppBlocker.isServiceEnabled() === true; } catch { return false; }
  },

  async requestAccessibilityPermission(): Promise<void> {
    if (!isAvailable) return;
    await NativeAppBlocker.requestAccessibilityPermission();
  },

  async getInstalledApps(): Promise<BlockedApp[]> {
    if (!isAvailable) return [];
    try { return await NativeAppBlocker.getInstalledApps(); } catch { return []; }
  },

  setBlockedApps(apps: BlockedApp[]): void {
    if (!isAvailable) return;
    try { NativeAppBlocker.setBlockedApps(JSON.stringify(apps)); } catch {}
  },

  getBlockedApps(): BlockedApp[] {
    if (!isAvailable) return [];
    try { return JSON.parse(NativeAppBlocker.getBlockedApps() ?? "[]"); } catch { return []; }
  },

  addGracePeriod(packageName: string, minutes: number): void {
    if (!isAvailable) return;
    try { NativeAppBlocker.addGracePeriod(packageName, minutes); } catch {}
  },

  isInGracePeriod(packageName: string): boolean {
    if (!isAvailable) return false;
    try { return NativeAppBlocker.isInGracePeriod(packageName) === true; } catch { return false; }
  },
};
