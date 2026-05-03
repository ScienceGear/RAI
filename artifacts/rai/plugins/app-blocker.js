const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const ACCESSIBILITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagReportViewIds"
    android:canRetrieveWindowContent="false"
    android:notificationTimeout="100" />
`;

function withAccessibilityConfigFile(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml"
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, "accessibility_service_config.xml"),
        ACCESSIBILITY_CONFIG_XML,
        "utf8"
      );
      return config;
    },
  ]);
}

function withAccessibilityServiceManifest(config) {
  return withAndroidManifest(config, (config) => {
    const { manifest } = config.modResults;
    if (!Array.isArray(manifest.application)) return config;

    const app = manifest.application[0];
    if (!app.service) app.service = [];

    const serviceExists = app.service.some(
      (s) =>
        s.$?.["android:name"] === "expo.modules.appblocker.AppBlockerService"
    );

    if (!serviceExists) {
      app.service.push({
        $: {
          "android:name": "expo.modules.appblocker.AppBlockerService",
          "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name":
                    "android.accessibilityservice.AccessibilityService",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.accessibilityservice",
              "android:resource": "@xml/accessibility_service_config",
            },
          },
        ],
      });
    }

    if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
    const hasOverlay = manifest["uses-permission"].some(
      (p) =>
        p.$?.["android:name"] === "android.permission.SYSTEM_ALERT_WINDOW"
    );
    if (!hasOverlay) {
      manifest["uses-permission"].push({
        $: { "android:name": "android.permission.SYSTEM_ALERT_WINDOW" },
      });
    }

    return config;
  });
}

module.exports = function withAppBlocker(config) {
  config = withAccessibilityConfigFile(config);
  config = withAccessibilityServiceManifest(config);
  return config;
};
