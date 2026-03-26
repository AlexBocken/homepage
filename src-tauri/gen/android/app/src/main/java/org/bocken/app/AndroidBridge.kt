package org.bocken.app

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

class AndroidBridge(private val context: Context) {

    private var ttsForVoices: TextToSpeech? = null

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
                        1003
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
                        1002
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
        val intent = Intent(context, LocationForegroundService::class.java)
        context.stopService(intent)
    }

    @JavascriptInterface
    fun getPoints(): String {
        return LocationForegroundService.drainPoints()
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
     * This initializes a temporary TTS engine; the result is returned asynchronously
     * via a callback, but since @JavascriptInterface is synchronous we block briefly.
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
}
