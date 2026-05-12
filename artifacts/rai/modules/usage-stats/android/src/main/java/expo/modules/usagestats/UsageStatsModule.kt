package expo.modules.usagestats

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Calendar

class UsageStatsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("UsageStats")

    Function("hasPermission") {
      val context = appContext.reactContext ?: return@Function false
      hasUsageAccessInternal(context)
    }

    Function("hasUsageAccess") {
      val context = appContext.reactContext ?: return@Function false
      hasUsageAccessInternal(context)
    }

    Function("isBatteryOptimizationIgnored") {
      val context = appContext.reactContext ?: return@Function false
      val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    AsyncFunction("requestPermission") { promise: Promise ->
      openIntent(promise, Settings.ACTION_USAGE_ACCESS_SETTINGS)
    }

    AsyncFunction("requestIgnoreBatteryOptimizations") { promise: Promise ->
      try {
        val context = appContext.reactContext ?: run { promise.resolve(null); return@AsyncFunction }
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
          data = Uri.parse("package:${context.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR_BATTERY_SETTINGS", e.message, e)
      }
    }

    AsyncFunction("getTodayUsage") { promise: Promise ->
      try {
        val context = appContext.reactContext ?: run { promise.resolve(emptyList<Any>()); return@AsyncFunction }
        if (!hasUsageAccessInternal(context)) {
          promise.reject("ERR_NO_USAGE_ACCESS", "Usage access not granted", null)
          return@AsyncFunction
        }
        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val result = queryUsageTotals(context, cal.timeInMillis, System.currentTimeMillis())
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("ERR_GET_TODAY_USAGE", e.message, e)
      }
    }

    AsyncFunction("getUsageByHourForDate") { startOfDayMs: Double, promise: Promise ->
      try {
        val context = appContext.reactContext ?: run { promise.resolve(emptyList<Any>()); return@AsyncFunction }
        if (!hasUsageAccessInternal(context)) {
          promise.reject("ERR_NO_USAGE_ACCESS", "Usage access not granted", null)
          return@AsyncFunction
        }
        val startMs = startOfDayMs.toLong()
        val endMs = startMs + 86_400_000L
        val result = queryUsageByHourAndPackage(context, startMs, endMs)
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("ERR_GET_USAGE_BY_HOUR", e.message, e)
      }
    }

    // Backwards-compat aliases already used in JS
    AsyncFunction("getTodayAppUsage") { promise: Promise ->
      try {
        val context = appContext.reactContext ?: run { promise.resolve(emptyList<Any>()); return@AsyncFunction }
        if (!hasUsageAccessInternal(context)) {
          promise.reject("ERR_NO_USAGE_ACCESS", "Usage access not granted", null)
          return@AsyncFunction
        }
        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val start = cal.timeInMillis
        val end = System.currentTimeMillis()
        val usage = queryUsageTotals(context, start, end)
        val legacy = usage.map {
          mapOf(
            "packageName" to it["packageName"],
            "appName" to it["packageName"],
            "totalMinutes" to ((it["totalTimeInForeground"] as Long) / 60_000L).toInt(),
            "openCount" to 0,
            "category" to inferCategory(it["packageName"] as String),
            "iconBase64" to "",
          )
        }
        promise.resolve(legacy)
      } catch (e: Exception) {
        promise.reject("ERR_USAGE_STATS", e.message, e)
      }
    }

    AsyncFunction("getUsageForDate") { dateMs: Double, promise: Promise ->
      try {
        val context = appContext.reactContext ?: run { promise.resolve(emptyList<Any>()); return@AsyncFunction }
        if (!hasUsageAccessInternal(context)) {
          promise.reject("ERR_NO_USAGE_ACCESS", "Usage access not granted", null)
          return@AsyncFunction
        }
        val startMs = dateMs.toLong()
        val endMs = startMs + 86_400_000L
        val usage = queryUsageTotals(context, startMs, endMs)
        val legacy = usage.map {
          mapOf(
            "packageName" to it["packageName"],
            "appName" to it["packageName"],
            "totalMinutes" to ((it["totalTimeInForeground"] as Long) / 60_000L).toInt(),
            "openCount" to 0,
            "category" to inferCategory(it["packageName"] as String),
            "iconBase64" to "",
          )
        }
        promise.resolve(legacy)
      } catch (e: Exception) {
        promise.reject("ERR_USAGE_STATS", e.message, e)
      }
    }

    AsyncFunction("getHourlyScreenTimeForDate") { dateMs: Double, promise: Promise ->
      try {
        val context = appContext.reactContext ?: run { promise.resolve(emptyList<Any>()); return@AsyncFunction }
        if (!hasUsageAccessInternal(context)) {
          promise.reject("ERR_NO_USAGE_ACCESS", "Usage access not granted", null)
          return@AsyncFunction
        }
        val startMs = dateMs.toLong()
        val endMs = startMs + 86_400_000L
        val rows = queryUsageByHourAndPackage(context, startMs, endMs)
        val byHour = IntArray(24)
        for (row in rows) {
          val hour = row["hour"] as Int
          val ms = row["totalTimeInForeground"] as Long
          byHour[hour] += (ms / 60_000L).toInt()
        }
        val result = (0..23).map { h ->
          mapOf("hour" to h, "totalMinutes" to byHour[h], "sessionCount" to 0)
        }
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("ERR_HOURLY", e.message, e)
      }
    }

    AsyncFunction("getHourlyScreenTime") { promise: Promise ->
      val cal = Calendar.getInstance()
      cal.set(Calendar.HOUR_OF_DAY, 0)
      cal.set(Calendar.MINUTE, 0)
      cal.set(Calendar.SECOND, 0)
      cal.set(Calendar.MILLISECOND, 0)
      val start = cal.timeInMillis
      val end = System.currentTimeMillis()
      val context = appContext.reactContext ?: run { promise.resolve(emptyList<Any>()); return@AsyncFunction }
      val rows = queryUsageByHourAndPackage(context, start, end)
      val byHour = IntArray(24)
      for (row in rows) {
        val hour = row["hour"] as Int
        val ms = row["totalTimeInForeground"] as Long
        byHour[hour] += (ms / 60_000L).toInt()
      }
      val result = (0..23).map { h ->
        mapOf("hour" to h, "totalMinutes" to byHour[h], "sessionCount" to 0)
      }
      promise.resolve(result)
    }

    AsyncFunction("getUnlockCount") { startMs: Double, endMs: Double, promise: Promise ->
      try {
        val context = appContext.reactContext ?: run { promise.resolve(0); return@AsyncFunction }
        if (!hasUsageAccessInternal(context)) {
          promise.resolve(0)
          return@AsyncFunction
        }
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val events = usm.queryEvents(startMs.toLong(), endMs.toLong())
        val event = UsageEvents.Event()
        var unlocks = 0
        while (events.hasNextEvent()) {
          events.getNextEvent(event)
          if (event.eventType == UsageEvents.Event.SCREEN_INTERACTIVE) unlocks++
        }
        promise.resolve(unlocks)
      } catch (e: Exception) {
        promise.resolve(0)
      }
    }

    AsyncFunction("getWeeklyTotals") { promise: Promise ->
      try {
        val context = appContext.reactContext ?: run { promise.resolve(emptyList<Any>()); return@AsyncFunction }
        if (!hasUsageAccessInternal(context)) {
          promise.resolve(emptyList<Any>())
          return@AsyncFunction
        }
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val cal = Calendar.getInstance()
        val end = cal.timeInMillis
        cal.add(Calendar.DAY_OF_YEAR, -6)
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        val start = cal.timeInMillis
        val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end)
        val ownPackage = context.packageName
        val dayTotals = mutableMapOf<String, Long>()
        for (stat in stats) {
          if (stat.packageName == ownPackage) continue
          val dateCal = Calendar.getInstance()
          dateCal.timeInMillis = stat.lastTimeUsed
          val key = "${dateCal.get(Calendar.YEAR)}-${dateCal.get(Calendar.MONTH) + 1}-${dateCal.get(Calendar.DAY_OF_MONTH)}"
          dayTotals[key] = (dayTotals[key] ?: 0L) + stat.totalTimeInForeground
        }
        val result = dayTotals.map { (date, ms) ->
          mapOf("date" to date, "totalMinutes" to (ms / 60_000L).toInt())
        }
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("ERR_WEEKLY", e.message, e)
      }
    }
  }

  private fun openIntent(promise: Promise, action: String) {
    try {
      val context = appContext.reactContext ?: run { promise.resolve(null); return }
      val intent = Intent(action)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERR_OPEN_SETTINGS", e.message, e)
    }
  }

  private fun hasUsageAccessInternal(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun queryUsageTotals(context: Context, startMs: Long, endMs: Long): List<Map<String, Any>> {
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val ownPackage = context.packageName
    val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startMs, endMs)
    return stats
      .filter { it.packageName != ownPackage && it.totalTimeInForeground > 0L }
      .map {
        mapOf(
          "packageName" to it.packageName,
          "totalTimeInForeground" to it.totalTimeInForeground,
        )
      }
  }

  private fun queryUsageByHourAndPackage(context: Context, startMs: Long, endMs: Long): List<Map<String, Any>> {
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val ownPackage = context.packageName
    val events = usm.queryEvents(startMs, endMs)
    val event = UsageEvents.Event()
    val activeStarts = mutableMapOf<String, Long>()
    val totals = mutableMapOf<Pair<Int, String>, Long>()

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val pkg = event.packageName ?: continue
      if (pkg == ownPackage) continue
      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> activeStarts[pkg] = event.timeStamp
        UsageEvents.Event.ACTIVITY_PAUSED -> {
          val sessionStart = activeStarts.remove(pkg) ?: continue
          accumulateSession(totals, pkg, sessionStart, event.timeStamp)
        }
      }
    }

    val now = System.currentTimeMillis()
    for ((pkg, sessionStart) in activeStarts) {
      accumulateSession(totals, pkg, sessionStart, now)
    }

    return totals.map { (key, ms) ->
      mapOf(
        "hour" to key.first,
        "packageName" to key.second,
        "totalTimeInForeground" to ms,
      )
    }
  }

  private fun accumulateSession(
    totals: MutableMap<Pair<Int, String>, Long>,
    packageName: String,
    startMs: Long,
    endMs: Long,
  ) {
    if (endMs <= startMs) return
    var cursor = startMs
    while (cursor < endMs) {
      val cal = Calendar.getInstance()
      cal.timeInMillis = cursor
      val hour = cal.get(Calendar.HOUR_OF_DAY)
      cal.set(Calendar.MINUTE, 59)
      cal.set(Calendar.SECOND, 59)
      cal.set(Calendar.MILLISECOND, 999)
      val segmentEnd = minOf(endMs, cal.timeInMillis + 1)
      val duration = segmentEnd - cursor
      val key = Pair(hour, packageName)
      totals[key] = (totals[key] ?: 0L) + duration
      cursor = segmentEnd
    }
  }

  private fun inferCategory(packageName: String): String {
    val lower = packageName.lowercase()
    return when {
      lower.contains("instagram") || lower.contains("facebook") || lower.contains("twitter") || lower.contains("reddit") -> "social"
      lower.contains("youtube") || lower.contains("netflix") -> "entertainment"
      lower.contains("chrome") || lower.contains("firefox") || lower.contains("browser") -> "browser"
      lower.contains("game") -> "games"
      else -> "other"
    }
  }
}

