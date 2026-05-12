package expo.modules.appblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.accessibility.AccessibilityEvent
import org.json.JSONArray
import org.json.JSONObject

class AppBlockerService : AccessibilityService() {

  companion object {
    @Volatile var isRunning = false
    private var blockedApps: Set<String> = emptySet()

    fun refreshBlockedApps(context: Context) {
      val prefs = context.getSharedPreferences(AppBlockerModule.PREFS_NAME, Context.MODE_PRIVATE)
      val json = prefs.getString(AppBlockerModule.KEY_BLOCKED, "[]") ?: "[]"
      blockedApps = try {
        val arr = JSONArray(json)
        (0 until arr.length()).map { arr.getJSONObject(it).getString("packageName") }.toSet()
      } catch (_: Exception) { emptySet() }
    }

    private fun isInGrace(context: Context, packageName: String): Boolean {
      val prefs = context.getSharedPreferences(AppBlockerModule.PREFS_NAME, Context.MODE_PRIVATE)
      val graceJson = prefs.getString(AppBlockerModule.KEY_GRACE, "{}") ?: "{}"
      return try {
        val obj = JSONObject(graceJson)
        if (!obj.has(packageName)) return false
        System.currentTimeMillis() < obj.getLong(packageName)
      } catch (_: Exception) { false }
    }
  }

  override fun onServiceConnected() {
    isRunning = true
    refreshBlockedApps(this)
    val info = serviceInfo ?: AccessibilityServiceInfo()
    info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
    info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
    info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
    info.notificationTimeout = 100
    serviceInfo = info
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent) {
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    if (pkg == packageName) return                  // RAI itself — ignore
    if (pkg.startsWith("com.android")) return       // System UI — ignore
    if (!blockedApps.contains(pkg)) return          // Not blocked
    if (isInGrace(this, pkg)) return                // In grace period — allow

    // Get human-readable app name
    val appName = try {
      val pm = packageManager
      val info = pm.getApplicationInfo(pkg, 0)
      pm.getApplicationLabel(info).toString()
    } catch (_: Exception) { pkg }

    // Launch RAI blocker screen via deep link
    val intent = Intent(
      Intent.ACTION_VIEW,
      Uri.parse("rai://blocker?app=${Uri.encode(pkg)}&name=${Uri.encode(appName)}")
    ).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    try {
      startActivity(intent)
    } catch (_: Exception) {}
  }

  override fun onInterrupt() {}

  override fun onDestroy() {
    isRunning = false
    super.onDestroy()
  }
}
