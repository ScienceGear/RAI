package expo.modules.appblocker

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

class AppBlockerModule : Module() {
  companion object {
    const val PREFS_NAME = "RaiAppBlocker"
    const val KEY_BLOCKED = "blockedApps"
    const val KEY_GRACE = "graceMap"
  }

  override fun definition() = ModuleDefinition {
    Name("AppBlocker")

    // Check if Accessibility Service is running
    Function("isServiceEnabled") {
      val ctx = appContext.reactContext ?: return@Function false
      AppBlockerService.isRunning
    }

    // Open Accessibility settings so user can enable the service
    AsyncFunction("requestAccessibilityPermission") { promise: Promise ->
      try {
        val ctx = appContext.reactContext ?: run { promise.resolve(null); return@AsyncFunction }
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ctx.startActivity(intent)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR_OPEN_SETTINGS", e.message, e)
      }
    }

    // Get list of installed non-system apps
    AsyncFunction("getInstalledApps") { promise: Promise ->
      try {
        val ctx = appContext.reactContext ?: run { promise.resolve(emptyList<Any>()); return@AsyncFunction }
        val pm = ctx.packageManager
        val intent = Intent(Intent.ACTION_MAIN, null)
        intent.addCategory(Intent.CATEGORY_LAUNCHER)
        val apps = pm.queryIntentActivities(intent, 0)
          .filter { it.activityInfo.packageName != ctx.packageName }
          .map { info ->
            mapOf(
              "packageName" to info.activityInfo.packageName,
              "appName" to (pm.getApplicationLabel(info.activityInfo.applicationInfo).toString())
            )
          }
          .distinctBy { it["packageName"] }
          .sortedBy { it["appName"] as String }
        promise.resolve(apps)
      } catch (e: Exception) {
        promise.reject("ERR_APPS", e.message, e)
      }
    }

    // Save blocked apps list
    Function("setBlockedApps") { appsJson: String ->
      val ctx = appContext.reactContext ?: return@Function
      val prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().putString(KEY_BLOCKED, appsJson).apply()
      // Notify running service
      AppBlockerService.refreshBlockedApps(ctx)
    }

    // Get blocked apps list
    Function("getBlockedApps") {
      val ctx = appContext.reactContext ?: return@Function "[]"
      val prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.getString(KEY_BLOCKED, "[]") ?: "[]"
    }

    // Add grace period (minutes) for a specific package
    Function("addGracePeriod") { packageName: String, minutes: Int ->
      val ctx = appContext.reactContext ?: return@Function
      val prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val until = System.currentTimeMillis() + minutes * 60_000L
      val graceJson = prefs.getString(KEY_GRACE, "{}") ?: "{}"
      // Simple JSON manipulation — store as "pkg:until" pairs
      val updated = graceJson.trimEnd('}') +
        (if (graceJson.length > 2) "," else "") +
        "\"$packageName\":$until}"
      prefs.edit().putString(KEY_GRACE, updated).apply()
    }

    // Check if a package is currently in grace period
    Function("isInGracePeriod") { packageName: String ->
      val ctx = appContext.reactContext ?: return@Function false
      val prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val graceJson = prefs.getString(KEY_GRACE, "{}") ?: "{}"
      try {
        val obj = org.json.JSONObject(graceJson)
        if (!obj.has(packageName)) return@Function false
        val until = obj.getLong(packageName)
        System.currentTimeMillis() < until
      } catch (_: Exception) { false }
    }
  }
}
