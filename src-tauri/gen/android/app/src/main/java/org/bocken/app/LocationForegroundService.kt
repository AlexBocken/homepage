package org.bocken.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.Manifest
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.LocationListener
import android.location.LocationManager
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.Collections
import java.util.Locale
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.math.*

private const val TAG = "BockenTTS"

class LocationForegroundService : Service(), TextToSpeech.OnInitListener, SensorEventListener {

    private var locationManager: LocationManager? = null
    private var locationListener: LocationListener? = null
    private var notificationManager: NotificationManager? = null

    // Step detector for cadence
    private var sensorManager: SensorManager? = null
    private var stepDetector: Sensor? = null
    private val stepTimestamps = ConcurrentLinkedQueue<Long>()
    private val CADENCE_WINDOW_MS = 15_000L // 15 second rolling window
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

    // Interval tracking
    private var intervalSteps: List<IntervalStep> = emptyList()
    private var currentIntervalIdx: Int = 0
    private var intervalAccumulatedDistanceKm: Double = 0.0
    private var intervalStartTimeMs: Long = 0L
    private var intervalsComplete: Boolean = false

    // Audio focus / ducking
    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private var hasAudioFocus = false

    data class IntervalStep(
        val label: String,
        val durationType: String, // "distance" or "time"
        val durationValue: Double // meters (distance) or seconds (time)
    )

    data class TtsConfig(
        val enabled: Boolean = false,
        val triggerType: String = "distance", // "distance" or "time"
        val triggerValue: Double = 1.0,        // km or minutes
        val metrics: List<String> = listOf("totalTime", "totalDistance", "avgPace"),
        val language: String = "en",
        val voiceId: String? = null,
        val ttsVolume: Float = 0.8f,           // 0.0–1.0 relative TTS volume
        val audioDuck: Boolean = false,        // duck other audio during TTS
        val intervals: List<IntervalStep> = emptyList()
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
                    val intervalsArr = obj.optJSONArray("intervals")
                    val intervals = if (intervalsArr != null) {
                        (0 until intervalsArr.length()).map { i ->
                            val step = intervalsArr.getJSONObject(i)
                            IntervalStep(
                                label = step.optString("label", ""),
                                durationType = step.optString("durationType", "time"),
                                durationValue = step.optDouble("durationValue", 0.0)
                            )
                        }
                    } else {
                        emptyList()
                    }
                    TtsConfig(
                        enabled = obj.optBoolean("enabled", false),
                        triggerType = obj.optString("triggerType", "distance"),
                        triggerValue = obj.optDouble("triggerValue", 1.0),
                        metrics = metrics,
                        language = obj.optString("language", "en"),
                        voiceId = obj.optString("voiceId", null),
                        ttsVolume = obj.optDouble("ttsVolume", 0.8).toFloat().coerceIn(0f, 1f),
                        audioDuck = obj.optBoolean("audioDuck", false),
                        intervals = intervals
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

        fun getIntervalState(): String {
            val svc = instance ?: return "{}"
            if (svc.intervalSteps.isEmpty()) return "{}"
            val obj = JSONObject()
            obj.put("currentIndex", svc.currentIntervalIdx)
            obj.put("totalSteps", svc.intervalSteps.size)
            obj.put("complete", svc.intervalsComplete)
            if (!svc.intervalsComplete && svc.currentIntervalIdx < svc.intervalSteps.size) {
                val step = svc.intervalSteps[svc.currentIntervalIdx]
                obj.put("currentLabel", step.label)
                val progress = when (step.durationType) {
                    "distance" -> {
                        val target = step.durationValue / 1000.0
                        if (target > 0) (svc.intervalAccumulatedDistanceKm / target).coerceIn(0.0, 1.0) else 0.0
                    }
                    "time" -> {
                        val target = step.durationValue * 1000.0
                        if (target > 0) ((System.currentTimeMillis() - svc.intervalStartTimeMs) / target).coerceIn(0.0, 1.0) else 0.0
                    }
                    else -> 0.0
                }
                obj.put("progress", progress)
            } else {
                obj.put("currentLabel", "")
                obj.put("progress", 1.0)
            }
            return obj.toString()
        }

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

    // --- Step detector sensor callbacks ---

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_STEP_DETECTOR) {
            if (!paused) {
                stepTimestamps.add(System.currentTimeMillis())
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    /**
     * Compute cadence (steps per minute) from recent step detector events.
     * Returns null if no steps detected in the rolling window.
     */
    private fun computeCadence(): Double? {
        val now = System.currentTimeMillis()
        val cutoff = now - CADENCE_WINDOW_MS
        // Prune old timestamps
        while (stepTimestamps.peek()?.let { it < cutoff } == true) {
            stepTimestamps.poll()
        }
        val count = stepTimestamps.size
        if (count < 2) return null
        val windowMs = now - (stepTimestamps.peek() ?: now)
        if (windowMs < 2000) return null // need at least 2s of data
        return count.toDouble() / (windowMs / 60000.0)
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        notificationManager = getSystemService(NotificationManager::class.java)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val startPaused = intent?.getBooleanExtra("startPaused", false) ?: false
        startTimeMs = System.currentTimeMillis()
        pausedAccumulatedMs = 0L
        pausedSinceMs = if (startPaused) startTimeMs else 0L
        paused = startPaused
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

        // Initialize interval tracking
        intervalSteps = ttsConfig?.intervals ?: emptyList()
        currentIntervalIdx = 0
        intervalAccumulatedDistanceKm = 0.0
        intervalStartTimeMs = startTimeMs
        intervalsComplete = false
        if (intervalSteps.isNotEmpty()) {
            Log.d(TAG, "Intervals configured: ${intervalSteps.size} steps")
            intervalSteps.forEachIndexed { i, step ->
                Log.d(TAG, "  Step $i: ${step.label} ${step.durationValue} ${step.durationType}")
            }
        }

        val notifIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        pendingIntent = PendingIntent.getActivity(
            this, 0, notifIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = if (startPaused) {
            buildNotification("Waiting to start...", "", "")
        } else {
            buildNotification("0:00", "0.00 km", "")
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        startLocationUpdates()
        startStepDetector()
        tracking = true
        instance = this

        // Initialize TTS *after* startForeground — using applicationContext for reliable engine binding
        if (ttsConfig?.enabled == true) {
            Log.d(TAG, "Initializing TTS engine (post-startForeground)...")
            lastAnnouncementDistanceKm = 0.0
            lastAnnouncementTimeMs = startTimeMs
            splitDistanceAtLastAnnouncement = 0.0
            splitTimeAtLastAnnouncement = startTimeMs

            val dummyTts = TextToSpeech(applicationContext, null)
            val engines = dummyTts.engines
            Log.d(TAG, "Available TTS engines: ${engines.map { "${it.label} (${it.name})" }}")
            dummyTts.shutdown()

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

    /** Called when TTS is ready — either immediately (pre-warmed) or from onInit (cold start). */
    private fun onTtsReady() {
        val config = ttsConfig ?: return
        Log.d(TAG, "TTS ready! triggerType=${config.triggerType}, triggerValue=${config.triggerValue}")

        // Set specific voice if requested
        if (!config.voiceId.isNullOrEmpty()) {
            tts?.voices?.find { it.name == config.voiceId }?.let { voice ->
                tts?.voice = voice
            }
        }

        // Announce workout started
        speakWithConfig("Workout started", "workout_started")

        // Announce first interval step if intervals are configured (queue after "Workout started")
        if (intervalSteps.isNotEmpty() && !intervalsComplete) {
            val first = intervalSteps[0]
            val durationText = if (first.durationType == "distance") {
                "${first.durationValue.toInt()} meters"
            } else {
                val secs = first.durationValue.toInt()
                if (secs >= 60) {
                    val m = secs / 60
                    val s = secs % 60
                    if (s > 0) "$m minutes $s seconds" else "$m minutes"
                } else {
                    "$secs seconds"
                }
            }
            speakWithConfig("${first.label}. $durationText", "interval_announcement", flush = false)
        }

        // Set up time-based trigger if configured
        if (config.triggerType == "time") {
            startTimeTrigger(config.triggerValue)
        }
    }

    override fun onInit(status: Int) {
        Log.d(TAG, "TTS onInit status=$status (SUCCESS=${TextToSpeech.SUCCESS})")
        if (status == TextToSpeech.SUCCESS) {
            val config = ttsConfig ?: return
            val locale = Locale.forLanguageTag(config.language)
            val langResult = tts?.setLanguage(locale)
            Log.d(TAG, "TTS setLanguage($locale) result=$langResult")
            ttsReady = true
            onTtsReady()
        } else {
            Log.e(TAG, "TTS init FAILED with status=$status")
        }
    }

    private fun requestAudioFocus() {
        val config = ttsConfig ?: return
        if (!config.audioDuck) return
        if (hasAudioFocus) return

        audioManager = audioManager ?: getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val focusReq = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setOnAudioFocusChangeListener { }
                .build()
            audioFocusRequest = focusReq
            val result = audioManager?.requestAudioFocus(focusReq)
            hasAudioFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            Log.d(TAG, "Audio focus request (duck): granted=$hasAudioFocus")
        } else {
            @Suppress("DEPRECATION")
            val result = audioManager?.requestAudioFocus(
                { },
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
            )
            hasAudioFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
    }

    private fun abandonAudioFocus() {
        if (!hasAudioFocus) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
        } else {
            @Suppress("DEPRECATION")
            audioManager?.abandonAudioFocus { }
        }
        hasAudioFocus = false
    }

    /** Speak text with configured volume; requests/abandons audio focus for ducking. */
    private fun speakWithConfig(text: String, utteranceId: String, flush: Boolean = true) {
        if (!ttsReady) return
        val config = ttsConfig ?: return
        val queueMode = if (flush) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD

        requestAudioFocus()

        val params = Bundle().apply {
            putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, config.ttsVolume)
        }

        // Set up listener to abandon audio focus after utterance completes
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {}
            override fun onDone(id: String?) { abandonAudioFocus() }
            @Deprecated("Deprecated in Java")
            override fun onError(id: String?) { abandonAudioFocus() }
        })

        val result = tts?.speak(text, queueMode, params, utteranceId)
        Log.d(TAG, "speakWithConfig($utteranceId) result=$result vol=${config.ttsVolume} duck=${config.audioDuck}")
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

    private fun checkIntervalProgress(segmentKm: Double) {
        if (intervalsComplete || intervalSteps.isEmpty()) return
        if (currentIntervalIdx >= intervalSteps.size) return

        val step = intervalSteps[currentIntervalIdx]
        val now = System.currentTimeMillis()

        val complete = when (step.durationType) {
            "distance" -> {
                intervalAccumulatedDistanceKm += segmentKm
                intervalAccumulatedDistanceKm >= step.durationValue / 1000.0
            }
            "time" -> {
                (now - intervalStartTimeMs) >= step.durationValue * 1000
            }
            else -> false
        }

        if (complete) {
            currentIntervalIdx++
            intervalAccumulatedDistanceKm = 0.0
            intervalStartTimeMs = now

            if (currentIntervalIdx >= intervalSteps.size) {
                intervalsComplete = true
                Log.d(TAG, "All intervals complete!")
                announceIntervalTransition("Intervals complete")
            } else {
                val next = intervalSteps[currentIntervalIdx]
                val durationText = if (next.durationType == "distance") {
                    "${next.durationValue.toInt()} meters"
                } else {
                    val secs = next.durationValue.toInt()
                    if (secs >= 60) {
                        val m = secs / 60
                        val s = secs % 60
                        if (s > 0) "$m minutes $s seconds" else "$m minutes"
                    } else {
                        "$secs seconds"
                    }
                }
                Log.d(TAG, "Interval transition: step ${currentIntervalIdx}/${intervalSteps.size} — ${next.label} $durationText")
                announceIntervalTransition("${next.label}. $durationText")
            }
            updateNotification()
        }
    }

    private fun announceIntervalTransition(text: String) {
        if (!ttsReady) return
        Log.d(TAG, "Interval announcement: $text")
        speakWithConfig(text, "interval_announcement")
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
            speakWithConfig(text, "workout_announcement")
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
        val paceStr = if (intervalSteps.isNotEmpty() && !intervalsComplete && currentIntervalIdx < intervalSteps.size) {
            val step = intervalSteps[currentIntervalIdx]
            "${step.label} (${currentIntervalIdx + 1}/${intervalSteps.size})"
        } else if (intervalsComplete) {
            "Intervals done"
        } else {
            formatPace(currentPaceMinKm)
        }
        val notification = buildNotification(
            formatElapsed(),
            "%.2f km".format(totalDistanceKm),
            paceStr
        )
        notificationManager?.notify(NOTIFICATION_ID, notification)
    }

    private fun hasActivityRecognitionPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true
        return ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACTIVITY_RECOGNITION
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun startStepDetector() {
        if (!hasActivityRecognitionPermission()) {
            Log.d(TAG, "Step detector skipped — ACTIVITY_RECOGNITION not granted")
            return
        }
        if (stepDetector != null) return // already registered
        if (sensorManager == null) {
            sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        }
        stepDetector = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
        if (stepDetector != null) {
            sensorManager?.registerListener(this, stepDetector, SensorManager.SENSOR_DELAY_FASTEST)
            Log.d(TAG, "Step detector sensor registered")
        } else {
            Log.d(TAG, "Step detector sensor not available on this device")
        }
    }

    /** Called from MainActivity when ACTIVITY_RECOGNITION is granted mid-session. */
    fun onActivityRecognitionGranted() {
        Log.d(TAG, "ACTIVITY_RECOGNITION granted — retrying step detector registration")
        startStepDetector()
    }

    @Suppress("MissingPermission")
    private fun startLocationUpdates() {
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager

        locationListener = LocationListener { location ->
            val lat = location.latitude
            val lng = location.longitude
            val now = location.time

            // Always buffer GPS points (for track drawing) even when paused
            val cadence = computeCadence()
            val point = JSONObject().apply {
                put("lat", lat)
                put("lng", lng)
                if (location.hasAltitude()) put("altitude", location.altitude)
                if (location.hasSpeed()) put("speed", location.speed.toDouble())
                if (cadence != null) put("cadence", cadence)
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
                // Check interval progress with this segment's distance
                checkIntervalProgress(segmentKm)
            } else {
                // First point — check time-based intervals even with no distance
                checkIntervalProgress(0.0)
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

    /**
     * Build the finish summary text from current stats.
     * Must be called while service state is still valid (before clearing fields).
     */
    private fun buildFinishSummaryText(): String? {
        val config = ttsConfig ?: return null
        if (!config.enabled) return null

        val activeSecs = activeElapsedSecs()
        val h = activeSecs / 3600
        val m = (activeSecs % 3600) / 60
        val s = activeSecs % 60

        val parts = mutableListOf<String>()
        parts.add("Workout finished")

        val timeStr = if (h > 0) "$h hours $m minutes" else "$m minutes $s seconds"
        parts.add("Total time: $timeStr")

        if (totalDistanceKm > 0.01) {
            parts.add("Distance: ${"%.2f".format(totalDistanceKm)} kilometers")
        }

        if (totalDistanceKm > 0.01) {
            val avgPace = (activeSecs / 60.0) / totalDistanceKm
            val mins = avgPace.toInt()
            val secs = ((avgPace - mins) * 60).toInt()
            parts.add("Average pace: $mins minutes $secs seconds per kilometer")
        }

        return parts.joinToString(". ")
    }

    override fun onDestroy() {
        // Snapshot summary text while stats are still valid
        val summaryText = buildFinishSummaryText()
        val config = ttsConfig

        // Stop time-based TTS triggers
        ttsTimeRunnable?.let { ttsTimeHandler?.removeCallbacks(it) }
        ttsTimeHandler = null
        ttsTimeRunnable = null

        // Hand off the existing TTS instance for the finish summary.
        // We do NOT call tts?.stop() or tts?.shutdown() here — the utterance
        // listener will clean up after the summary finishes speaking.
        val finishTts = tts
        tts = null
        ttsReady = false

        tracking = false
        paused = false
        instance = null
        locationListener?.let { locationManager?.removeUpdates(it) }
        locationListener = null
        locationManager = null
        sensorManager?.unregisterListener(this)
        sensorManager = null
        stepDetector = null
        stepTimestamps.clear()
        abandonAudioFocus()

        // Speak finish summary using the handed-off TTS instance (already initialized)
        if (summaryText != null && finishTts != null && config != null) {
            Log.d(TAG, "Finish summary: $summaryText")

            // Audio focus for ducking
            val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            var focusReq: AudioFocusRequest? = null
            if (config.audioDuck && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                focusReq = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                    )
                    .setOnAudioFocusChangeListener { }
                    .build()
                am.requestAudioFocus(focusReq)
            }

            finishTts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(id: String?) {}
                override fun onDone(id: String?) { cleanup() }
                @Deprecated("Deprecated in Java")
                override fun onError(id: String?) { cleanup() }

                private fun cleanup() {
                    if (focusReq != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        am.abandonAudioFocusRequest(focusReq)
                    }
                    finishTts.shutdown()
                }
            })

            val params = Bundle().apply {
                putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, config.ttsVolume)
            }
            finishTts.speak(summaryText, TextToSpeech.QUEUE_FLUSH, params, "workout_finished")
        } else {
            finishTts?.shutdown()
        }

        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "GPS Tracking",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Shows while GPS is recording your workout"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
}
