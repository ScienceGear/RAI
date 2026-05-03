// Config plugin: adds Accessibility Service declaration to AndroidManifest.xml
const { withAndroidManifest } = require("@expo/config-plugins");

function addAccessibilityService(androidManifest) {
  const { manifest } = androidManifest;
  if (!Array.isArray(manifest.application)) return androidManifest;

  const app = manifest.application[0];
  if (!app.service) app.service = [];

  const serviceExists = app.service.some(
    (s) => s.$?.["android:name"] === "expo.modules.appblocker.AppBlockerService"
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
          action: [{ $: { "android:name": "android.accessibilityservice.AccessibilityService" } }],
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

  // Add SYSTEM_ALERT_WINDOW permission if not present
  if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
  const hasOverlay = manifest["uses-permission"].some(
    (p) => p.$?.["android:name"] === "android.permission.SYSTEM_ALERT_WINDOW"
  );
  if (!hasOverlay) {
    manifest["uses-permission"].push({
      $: { "android:name": "android.permission.SYSTEM_ALERT_WINDOW" },
    });
  }

  return androidManifest;
}

module.exports = function withAppBlocker(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults = addAccessibilityService(config.modResults);
    return config;
  });
};
