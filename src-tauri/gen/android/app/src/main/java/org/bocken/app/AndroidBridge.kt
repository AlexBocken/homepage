package org.bocken.app

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

class AndroidBridge(private val context: Context) {

    companion object {
        const val REQ_BACKGROUND_LOCATION = 1002
        const val REQ_NOTIFICATIONS = 1003
        const val REQ_ACTIVITY_RECOGNITION = 1004
    }

    @JavascriptInterface
    fun startLocationService(ttsConfigJson: String, startPaused: Boolean) {
        if (context is Activity) {
            // Request notification permission on Android 13+ (required for foreground service notification)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED
                ) {
                    ActivityCompat.requestPermissions(
                        context,
                        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                        REQ_NOTIFICATIONS
                    )
                }
            }

            // Request background location on Android 10+ (required for screen-off GPS)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                    != PackageManager.PERMISSION_GRANTED
                ) {
                    ActivityCompat.requestPermissions(
                        context,
                        arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION),
                        REQ_BACKGROUND_LOCATION
                    )
                }
            }

            // Request activity recognition on Android 10+ (required for step detector / cadence)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION)
                    != PackageManager.PERMISSION_GRANTED
                ) {
                    ActivityCompat.requestPermissions(
                        context,
                        arrayOf(Manifest.permission.ACTIVITY_RECOGNITION),
                        REQ_ACTIVITY_RECOGNITION
                    )
                }
            }
        }

        val intent = Intent(context, LocationForegroundService::class.java).apply {
            putExtra("ttsConfig", ttsConfigJson)
            putExtra("startPaused", startPaused)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    /** Overload: TTS config only (not paused) */
    @JavascriptInterface
    fun startLocationService(ttsConfigJson: String) {
        startLocationService(ttsConfigJson, false)
    }

    /** Overload: no args (not paused, no TTS) */
    @JavascriptInterface
    fun startLocationService() {
        startLocationService("{}", false)
    }

    @JavascriptInterface
    fun stopLocationService() {
        // Only a stop asked for here ends the persisted session; the service's own
        // onDestroy never does, so a system teardown stays recoverable.
        LocationForegroundService.markStopped(context)
        val intent = Intent(context, LocationForegroundService::class.java)
        context.stopService(intent)
    }

    /** Legacy destructive read — kept for an older cached page. */
    @JavascriptInterface
    fun getPoints(): String {
        return LocationForegroundService.drainPoints()
    }

    /** Points from [index] on. Non-destructive, so a reloaded page can re-read from 0. */
    @JavascriptInterface
    fun getPointsSince(index: Int): String {
        return LocationForegroundService.pointsSince(index)
    }

    /** {tracking, recoverable, prestart, paused, sessionId, startTimeMs, pointCount, totalDistanceKm} */
    @JavascriptInterface
    fun getSessionState(): String {
        return LocationForegroundService.sessionStateJson(context)
    }

    /**
     * Pick the session on disk back up (process was killed), or — when the service is
     * already running — re-assert it from the foreground so a background restart gets
     * its location access back.
     */
    @JavascriptInterface
    fun resumeLocationService() {
        val intent = Intent(context, LocationForegroundService::class.java).apply {
            putExtra(LocationForegroundService.EXTRA_RESUME, true)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    /** Drop a persisted session nobody wants back. */
    @JavascriptInterface
    fun discardSession() {
        LocationForegroundService.markStopped(context)
        context.stopService(Intent(context, LocationForegroundService::class.java))
        LocationForegroundService.discardPersisted(context)
    }

    /** Exempt from battery optimisation — the usual reason a long screen-off run is killed. */
    @JavascriptInterface
    fun isIgnoringBatteryOptimizations(): Boolean {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    @JavascriptInterface
    fun requestIgnoreBatteryOptimizations() {
        try {
            context.startActivity(
                Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )
        } catch (_: Exception) {
            // Some OEM builds lack the direct dialog; the settings list always exists.
            try {
                context.startActivity(
                    Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            } catch (_: Exception) {}
        }
    }

    @JavascriptInterface
    fun isTracking(): Boolean {
        return LocationForegroundService.tracking
    }

    @JavascriptInterface
    fun pauseTracking() {
        LocationForegroundService.instance?.doPause()
    }

    @JavascriptInterface
    fun resumeTracking() {
        LocationForegroundService.instance?.doResume()
    }

    @JavascriptInterface
    fun getIntervalState(): String {
        return LocationForegroundService.getIntervalState()
    }

    /** True if cadence (step detector) is usable — permission granted or not required (pre-Q). */
    @JavascriptInterface
    fun hasActivityRecognitionPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true
        return ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACTIVITY_RECOGNITION
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Force-vibrate bypassing silent/DND by using USAGE_ACCESSIBILITY attributes.
     * Why: default web Vibration API uses USAGE_TOUCH which Android silences.
     */
    @JavascriptInterface
    fun forceVibrate(durationMs: Long, intensityPct: Int) {
        val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
        if (vibrator?.hasVibrator() != true) return

        val amplitude = (intensityPct.coerceIn(1, 100) * 255 / 100).coerceAtLeast(1)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val effect = VibrationEffect.createOneShot(durationMs, amplitude)
            val attrs = VibrationAttributes.Builder()
                .setUsage(VibrationAttributes.USAGE_ACCESSIBILITY)
                .build()
            vibrator.vibrate(effect, attrs)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(durationMs, amplitude))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(durationMs)
        }
    }

    /** Returns true if at least one TTS engine is installed on the device. */
    @JavascriptInterface
    fun hasTtsEngine(): Boolean {
        val dummy = TextToSpeech(context, null)
        val hasEngine = dummy.engines.isNotEmpty()
        dummy.shutdown()
        return hasEngine
    }

    /** Opens the Android TTS install intent (prompts user to install a TTS engine). */
    @JavascriptInterface
    fun installTtsEngine() {
        val intent = Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    /**
     * Returns available TTS voices as a JSON array.
     * Each entry: { "id": "...", "name": "...", "language": "en-US" }
     */
    @JavascriptInterface
    fun getAvailableTtsVoices(): String {
        val result = JSONArray()
        try {
            val latch = java.util.concurrent.CountDownLatch(1)
            var engine: TextToSpeech? = null
            engine = TextToSpeech(context) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    engine?.voices?.forEach { voice ->
                        val obj = JSONObject().apply {
                            put("id", voice.name)
                            put("name", voice.name)
                            put("language", voice.locale.toLanguageTag())
                        }
                        result.put(obj)
                    }
                }
                latch.countDown()
            }
            latch.await(3, java.util.concurrent.TimeUnit.SECONDS)
            engine.shutdown()
        } catch (_: Exception) {}
        return result.toString()
    }

    /** Installed app version name (mirrors tauri.conf.json `version`). Used by
     *  the in-app update check to compare against the latest published build. */
    @JavascriptInterface
    fun getAppVersion(): String {
        return try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: ""
        } catch (_: Exception) {
            ""
        }
    }

    // --- Active workout notification (lifting sessions) ----------------------

    private fun sendWorkout(action: String, apply: (Intent) -> Unit = {}) {
        val intent = Intent(context, WorkoutForegroundService::class.java).apply {
            this.action = action
            apply(this)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    /** Start (or update) the persistent workout notification. `stateJson` is the
     *  ordered remaining-sets shadow the service renders + walks. */
    @JavascriptInterface
    fun startWorkoutService(stateJson: String) {
        // Notification permission is required for the foreground-service notification.
        if (context is Activity && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    context,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    REQ_NOTIFICATIONS
                )
            }
        }
        sendWorkout(WorkoutForegroundService.ACTION_START) {
            it.putExtra(WorkoutForegroundService.EXTRA_STATE, stateJson)
        }
    }

    /** Push a fresh remaining-sets shadow (current set / prefill changed). */
    @JavascriptInterface
    fun updateWorkoutState(stateJson: String) {
        sendWorkout(WorkoutForegroundService.ACTION_UPDATE) {
            it.putExtra(WorkoutForegroundService.EXTRA_STATE, stateJson)
        }
    }

    /** Tell native the authoritative rest window so it can beep at the end even
     *  while backgrounded. `restEndsAt` is epoch ms. */
    @JavascriptInterface
    fun startWorkoutRest(restEndsAt: String, restTotalSecs: Int) {
        sendWorkout(WorkoutForegroundService.ACTION_START_REST) {
            it.putExtra(WorkoutForegroundService.EXTRA_REST_ENDS_AT, restEndsAt.toLongOrNull() ?: 0L)
            it.putExtra(WorkoutForegroundService.EXTRA_REST_TOTAL, restTotalSecs)
        }
    }

    @JavascriptInterface
    fun stopWorkoutRest() {
        sendWorkout(WorkoutForegroundService.ACTION_STOP_REST)
    }

    /** Mirror an in-app-started timed hold so native shows its countdown and
     *  beeps at the end even while backgrounded. `holdEndsAt` is epoch ms. */
    @JavascriptInterface
    fun startWorkoutHold(holdEndsAt: String, holdTotalSecs: Int) {
        sendWorkout(WorkoutForegroundService.ACTION_MIRROR_HOLD) {
            it.putExtra(WorkoutForegroundService.EXTRA_HOLD_ENDS_AT, holdEndsAt.toLongOrNull() ?: 0L)
            it.putExtra(WorkoutForegroundService.EXTRA_HOLD_TOTAL, holdTotalSecs)
        }
    }

    @JavascriptInterface
    fun stopWorkoutHold() {
        sendWorkout(WorkoutForegroundService.ACTION_STOP_HOLD)
    }

    @JavascriptInterface
    fun stopWorkoutService() {
        sendWorkout(WorkoutForegroundService.ACTION_STOP)
    }

    /** True while the workout notification/service is live. */
    @JavascriptInterface
    fun isWorkoutServiceRunning(): Boolean {
        return WorkoutForegroundService.running
    }

    /** Drain the queued notification-originated events (completions / rest
     *  adjustments) for JS to replay into its store. JSON array string. */
    @JavascriptInterface
    fun drainWorkoutActions(): String {
        return WorkoutForegroundService.drainActions()
    }

    /** Consume a one-shot navigation route stashed by a notification tap. */
    @JavascriptInterface
    fun consumePendingRoute(): String {
        return MainActivity.consumePendingRoute()
    }

    /** Open a URL in the external browser / download manager. A plain in-webview
     *  link to an .apk won't trigger an Android download, so the update banner
     *  routes the APK link through here. */
    @JavascriptInterface
    fun openExternal(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (_: Exception) {}
    }
}
