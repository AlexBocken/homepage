package org.bocken.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.Collections
import java.util.Locale
import kotlin.math.*

private const val TAG = "BockenTTS"

class LocationForegroundService : Service(), TextToSpeech.OnInitListener {

    private var locationManager: LocationManager? = null
    private var locationListener: LocationListener? = null
    private var notificationManager: NotificationManager? = null
    private var pendingIntent: PendingIntent? = null
    private var startTimeMs: Long = 0L
    private var pausedAccumulatedMs: Long = 0L  // total time spent paused
    private var pausedSinceMs: Long = 0L        // timestamp when last paused (0 = not paused)
    private var lastLat: Double = Double.NaN
    private var lastLng: Double = Double.NaN
    private var lastTimestamp: Long = 0L
    private var currentPaceMinKm: Double = 0.0

    // TTS
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var ttsConfig: TtsConfig? = null
    private var ttsTimeHandler: Handler? = null
    private var ttsTimeRunnable: Runnable? = null
    private var lastAnnouncementDistanceKm: Double = 0.0
    private var lastAnnouncementTimeMs: Long = 0L
    private var splitDistanceAtLastAnnouncement: Double = 0.0
    private var splitTimeAtLastAnnouncement: Long = 0L

    data class TtsConfig(
        val enabled: Boolean = false,
        val triggerType: String = "distance", // "distance" or "time"
        val triggerValue: Double = 1.0,        // km or minutes
        val metrics: List<String> = listOf("totalTime", "totalDistance", "avgPace"),
        val language: String = "en",
        val voiceId: String? = null
    ) {
        companion object {
            fun fromJson(json: String): TtsConfig {
                return try {
                    val obj = JSONObject(json)
                    val metricsArr = obj.optJSONArray("metrics")
                    val metrics = if (metricsArr != null) {
                        (0 until metricsArr.length()).map { metricsArr.getString(it) }
                    } else {
                        listOf("totalTime", "totalDistance", "avgPace")
                    }
                    TtsConfig(
                        enabled = obj.optBoolean("enabled", false),
                        triggerType = obj.optString("triggerType", "distance"),
                        triggerValue = obj.optDouble("triggerValue", 1.0),
                        metrics = metrics,
                        language = obj.optString("language", "en"),
                        voiceId = obj.optString("voiceId", null)
                    )
                } catch (_: Exception) {
                    TtsConfig()
                }
            }
        }
    }

    companion object {
        const val CHANNEL_ID = "gps_tracking"
        const val NOTIFICATION_ID = 1001
        const val MIN_TIME_MS = 3000L
        const val MIN_DISTANCE_M = 0f

        private val pointBuffer = Collections.synchronizedList(mutableListOf<JSONObject>())
        var instance: LocationForegroundService? = null
            private set
        var tracking = false
            private set
        var paused = false
            private set
        var totalDistanceKm: Double = 0.0
            private set

        fun drainPoints(): String {
            val drained: List<JSONObject>
            synchronized(pointBuffer) {
                drained = ArrayList(pointBuffer)
                pointBuffer.clear()
            }
            val arr = JSONArray()
            for (p in drained) arr.put(p)
            return arr.toString()
        }

        private fun haversineKm(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
            val R = 6371.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLng = Math.toRadians(lng2 - lng1)
            val a = sin(dLat / 2).pow(2) +
                    cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLng / 2).pow(2)
            return 2 * R * asin(sqrt(a))
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        notificationManager = getSystemService(NotificationManager::class.java)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startTimeMs = System.currentTimeMillis()
        pausedAccumulatedMs = 0L
        pausedSinceMs = 0L
        paused = false
        totalDistanceKm = 0.0
        lastLat = Double.NaN
        lastLng = Double.NaN
        lastTimestamp = 0L
        currentPaceMinKm = 0.0

        // Parse TTS config from intent
        val configJson = intent?.getStringExtra("ttsConfig") ?: "{}"
        Log.d(TAG, "TTS config JSON: $configJson")
        ttsConfig = TtsConfig.fromJson(configJson)
        Log.d(TAG, "TTS enabled=${ttsConfig?.enabled}, trigger=${ttsConfig?.triggerType}/${ttsConfig?.triggerValue}, metrics=${ttsConfig?.metrics}")

        val notifIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        pendingIntent = PendingIntent.getActivity(
            this, 0, notifIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = buildNotification("0:00", "0.00 km", "")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        startLocationUpdates()
        tracking = true
        instance = this

        // Initialize TTS *after* startForeground — using applicationContext for reliable engine binding
        if (ttsConfig?.enabled == true) {
            Log.d(TAG, "Initializing TTS engine (post-startForeground)...")
            lastAnnouncementDistanceKm = 0.0
            lastAnnouncementTimeMs = startTimeMs
            splitDistanceAtLastAnnouncement = 0.0
            splitTimeAtLastAnnouncement = startTimeMs

            // Log available TTS engines
            val dummyTts = TextToSpeech(applicationContext, null)
            val engines = dummyTts.engines
            Log.d(TAG, "Available TTS engines: ${engines.map { "${it.label} (${it.name})" }}")
            dummyTts.shutdown()

            // Try with explicit engine if available
            if (engines.isNotEmpty()) {
                val engineName = engines[0].name
                Log.d(TAG, "Trying TTS with explicit engine: $engineName")
                tts = TextToSpeech(applicationContext, this, engineName)
            } else {
                Log.e(TAG, "No TTS engines found on device!")
                tts = TextToSpeech(applicationContext, this)
            }
        }

        return START_STICKY
    }

    // --- TTS ---

    override fun onInit(status: Int) {
        Log.d(TAG, "TTS onInit status=$status (SUCCESS=${TextToSpeech.SUCCESS})")
        if (status == TextToSpeech.SUCCESS) {
            val config = ttsConfig ?: return
            val locale = Locale.forLanguageTag(config.language)
            val langResult = tts?.setLanguage(locale)
            Log.d(TAG, "TTS setLanguage($locale) result=$langResult")

            // Set specific voice if requested
            if (!config.voiceId.isNullOrEmpty()) {
                tts?.voices?.find { it.name == config.voiceId }?.let { voice ->
                    tts?.voice = voice
                }
            }

            ttsReady = true
            Log.d(TAG, "TTS ready! triggerType=${config.triggerType}, triggerValue=${config.triggerValue}")

            // Set up time-based trigger if configured
            if (config.triggerType == "time") {
                startTimeTrigger(config.triggerValue)
            }
        } else {
            Log.e(TAG, "TTS init FAILED with status=$status")
        }
    }

    private fun startTimeTrigger(intervalMinutes: Double) {
        val intervalMs = (intervalMinutes * 60 * 1000).toLong()
        Log.d(TAG, "Starting time trigger: every ${intervalMs}ms (${intervalMinutes} min)")
        ttsTimeHandler = Handler(Looper.getMainLooper())
        ttsTimeRunnable = object : Runnable {
            override fun run() {
                Log.d(TAG, "Time trigger fired!")
                announceMetrics()
                ttsTimeHandler?.postDelayed(this, intervalMs)
            }
        }
        ttsTimeHandler?.postDelayed(ttsTimeRunnable!!, intervalMs)
    }

    // --- Pause / Resume ---

    fun doPause() {
        if (paused) return
        paused = true
        pausedSinceMs = System.currentTimeMillis()
        Log.d(TAG, "Tracking paused")

        // Pause TTS time trigger
        ttsTimeRunnable?.let { ttsTimeHandler?.removeCallbacks(it) }

        // Update notification to show paused state
        val notification = buildNotification(formatElapsed(), "%.2f km".format(totalDistanceKm), "PAUSED")
        notificationManager?.notify(NOTIFICATION_ID, notification)
    }

    fun doResume() {
        if (!paused) return
        // Accumulate paused duration
        pausedAccumulatedMs += System.currentTimeMillis() - pausedSinceMs
        pausedSinceMs = 0L
        paused = false
        Log.d(TAG, "Tracking resumed (total paused: ${pausedAccumulatedMs / 1000}s)")

        // Reset last position so we don't accumulate drift during pause
        lastLat = Double.NaN
        lastLng = Double.NaN
        lastTimestamp = 0L

        // Resume TTS time trigger
        val config = ttsConfig
        if (ttsReady && config != null && config.triggerType == "time") {
            val intervalMs = (config.triggerValue * 60 * 1000).toLong()
            ttsTimeRunnable?.let { ttsTimeHandler?.postDelayed(it, intervalMs) }
        }

        updateNotification()
    }

    private fun checkDistanceTrigger() {
        val config = ttsConfig ?: return
        if (!ttsReady || config.triggerType != "distance") return

        val sinceLast = totalDistanceKm - lastAnnouncementDistanceKm
        if (sinceLast >= config.triggerValue) {
            announceMetrics()
            lastAnnouncementDistanceKm = totalDistanceKm
        }
    }

    private fun announceMetrics() {
        if (!ttsReady) return
        val config = ttsConfig ?: return

        val now = System.currentTimeMillis()
        val activeSecs = activeElapsedSecs()
        val parts = mutableListOf<String>()

        for (metric in config.metrics) {
            when (metric) {
                "totalTime" -> {
                    val h = activeSecs / 3600
                    val m = (activeSecs % 3600) / 60
                    val s = activeSecs % 60
                    val timeStr = if (h > 0) {
                        "$h hours $m minutes"
                    } else {
                        "$m minutes $s seconds"
                    }
                    parts.add("Time: $timeStr")
                }
                "totalDistance" -> {
                    val distStr = "%.2f".format(totalDistanceKm)
                    parts.add("Distance: $distStr kilometers")
                }
                "avgPace" -> {
                    val elapsedMin = activeSecs / 60.0
                    if (totalDistanceKm > 0.01) {
                        val avgPace = elapsedMin / totalDistanceKm
                        val mins = avgPace.toInt()
                        val secs = ((avgPace - mins) * 60).toInt()
                        parts.add("Average pace: $mins minutes $secs seconds per kilometer")
                    }
                }
                "splitPace" -> {
                    val splitDist = totalDistanceKm - splitDistanceAtLastAnnouncement
                    val splitTimeMin = (now - splitTimeAtLastAnnouncement) / 60000.0
                    if (splitDist > 0.01) {
                        val splitPace = splitTimeMin / splitDist
                        val mins = splitPace.toInt()
                        val secs = ((splitPace - mins) * 60).toInt()
                        parts.add("Split pace: $mins minutes $secs seconds per kilometer")
                    }
                }
                "currentPace" -> {
                    if (currentPaceMinKm > 0 && currentPaceMinKm <= 60) {
                        val mins = currentPaceMinKm.toInt()
                        val secs = ((currentPaceMinKm - mins) * 60).toInt()
                        parts.add("Current pace: $mins minutes $secs seconds per kilometer")
                    }
                }
            }
        }

        // Update split tracking
        splitDistanceAtLastAnnouncement = totalDistanceKm
        splitTimeAtLastAnnouncement = now
        lastAnnouncementTimeMs = now

        if (parts.isNotEmpty()) {
            val text = parts.joinToString(". ")
            Log.d(TAG, "Announcing: $text")
            val result = tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "workout_announcement")
            Log.d(TAG, "TTS speak() result=$result (SUCCESS=${TextToSpeech.SUCCESS})")
        } else {
            Log.d(TAG, "announceMetrics: no parts to announce")
        }
    }

    // --- Notification / Location (unchanged) ---

    private fun formatPace(paceMinKm: Double): String {
        if (paceMinKm <= 0 || paceMinKm > 60) return ""
        val mins = paceMinKm.toInt()
        val secs = ((paceMinKm - mins) * 60).toInt()
        return "%d:%02d /km".format(mins, secs)
    }

    private fun buildNotification(elapsed: String, distance: String, pace: String): Notification {
        val parts = mutableListOf(elapsed, distance)
        if (pace.isNotEmpty()) parts.add(pace)
        val text = parts.joinToString(" · ")
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Bocken — Tracking GPS for active Workout")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("Bocken — Tracking GPS for active Workout")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        }
    }

    /** Returns active (non-paused) elapsed time in seconds. */
    private fun activeElapsedSecs(): Long {
        val now = System.currentTimeMillis()
        val totalPaused = pausedAccumulatedMs + if (pausedSinceMs > 0) (now - pausedSinceMs) else 0L
        return (now - startTimeMs - totalPaused) / 1000
    }

    private fun formatElapsed(): String {
        val secs = activeElapsedSecs()
        val h = secs / 3600
        val m = (secs % 3600) / 60
        val s = secs % 60
        return if (h > 0) {
            "%d:%02d:%02d".format(h, m, s)
        } else {
            "%d:%02d".format(m, s)
        }
    }

    private fun updateNotification() {
        val notification = buildNotification(
            formatElapsed(),
            "%.2f km".format(totalDistanceKm),
            formatPace(currentPaceMinKm)
        )
        notificationManager?.notify(NOTIFICATION_ID, notification)
    }

    @Suppress("MissingPermission")
    private fun startLocationUpdates() {
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager

        locationListener = LocationListener { location ->
            val lat = location.latitude
            val lng = location.longitude
            val now = location.time

            // Always buffer GPS points (for track drawing) even when paused
            val point = JSONObject().apply {
                put("lat", lat)
                put("lng", lng)
                if (location.hasAltitude()) put("altitude", location.altitude)
                if (location.hasSpeed()) put("speed", location.speed.toDouble())
                put("timestamp", location.time)
            }
            pointBuffer.add(point)

            // Skip distance/pace accumulation and TTS triggers when paused
            if (paused) return@LocationListener

            // Accumulate distance and compute pace
            if (!lastLat.isNaN()) {
                val segmentKm = haversineKm(lastLat, lastLng, lat, lng)
                totalDistanceKm += segmentKm
                if (segmentKm > 0.001 && lastTimestamp > 0) {
                    val dtMin = (now - lastTimestamp) / 60000.0
                    currentPaceMinKm = dtMin / segmentKm
                }
            }
            lastLat = lat
            lastLng = lng
            lastTimestamp = now

            updateNotification()

            // Check distance-based TTS trigger
            checkDistanceTrigger()
        }

        locationManager?.requestLocationUpdates(
            LocationManager.GPS_PROVIDER,
            MIN_TIME_MS,
            MIN_DISTANCE_M,
            locationListener!!
        )
    }

    override fun onDestroy() {
        tracking = false
        paused = false
        instance = null
        locationListener?.let { locationManager?.removeUpdates(it) }
        locationListener = null
        locationManager = null

        // Clean up TTS
        ttsTimeRunnable?.let { ttsTimeHandler?.removeCallbacks(it) }
        ttsTimeHandler = null
        ttsTimeRunnable = null
        tts?.stop()
        tts?.shutdown()
        tts = null
        ttsReady = false

        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "GPS Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows while GPS is recording your workout"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
}
