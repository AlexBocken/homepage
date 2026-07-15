package org.bocken.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.util.Collections

/**
 * Keeps a strength/lifting workout alive in the background so the rest-timer
 * beep, the persistent set notification, and "complete set" actions work while
 * the WebView is backgrounded or the screen is off (JS timers + Web Audio are
 * throttled/suspended there; a foreground service is not).
 *
 * Design — the JS store stays the source of truth; this service is a shadow:
 *   - JS pushes the ordered list of *remaining* sets (head = current set) plus
 *     the current rest end time via [AndroidBridge]. We only ever walk that
 *     pushed list; we never compute workout progression ourselves.
 *   - "Complete set" pops the head, records the completion (with the prefilled
 *     weight/reps JS gave us) into a drain queue, starts the next rest beep, and
 *     updates the notification to the next set — all without the WebView.
 *   - JS polls [drainActions] on resume / on an interval and replays the queued
 *     events into its store + server sync, then re-pushes fresh state (which
 *     corrects any drift). Completions are keyed by (exerciseIdx,setIdx) so a
 *     replay is idempotent.
 *
 * Scope: lifting sessions only. GPS/cardio sessions keep [LocationForegroundService].
 */
class WorkoutForegroundService : Service() {

    private var notificationManager: NotificationManager? = null
    private val handler = Handler(Looper.getMainLooper())
    private var restRunnable: Runnable? = null
    private var holdRunnable: Runnable? = null
    // Re-notify()s ~1×/sec while a rest/hold runs so the progress bar decays
    // (the system animates the chronometer text but not setProgress). Silent —
    // setOnlyAlertOnce(true) keeps these refreshes from re-alerting.
    private var tickRunnable: Runnable? = null
    private var pendingIntent: PendingIntent? = null

    /** Remaining sets, head = current. Each entry mirrors what JS pushed. */
    private val remaining = mutableListOf<SetInfo>()

    /** Epoch ms when the current rest ends, or 0 when not resting. */
    private var restEndsAt: Long = 0L

    /** Total seconds of the current rest (for the JS-side reconstruction). */
    private var restTotalSecs: Int = 0

    /** Epoch ms when the current timed hold (plank/stretch) ends, or 0. Only set
     *  for holds started from the notification — this service owns those. */
    private var holdEndsAt: Long = 0L

    /** Total seconds of the current hold (progress-bar denominator). */
    private var holdTotalSecs: Int = 0

    data class SetInfo(
        val exerciseIdx: Int,
        val setIdx: Int,
        val exerciseName: String,
        val setLabel: String,
        val weight: Double?,
        val reps: Int?,
        val isDuration: Boolean,
        val holdSecs: Int,
        val restSecs: Int
    )

    companion object {
        const val CHANNEL_ID = "workout_session"
        const val NOTIFICATION_ID = 1005

        const val ACTION_START = "org.bocken.app.workout.START"
        const val ACTION_UPDATE = "org.bocken.app.workout.UPDATE"
        const val ACTION_START_REST = "org.bocken.app.workout.START_REST"
        const val ACTION_STOP_REST = "org.bocken.app.workout.STOP_REST"
        const val ACTION_COMPLETE_SET = "org.bocken.app.workout.COMPLETE_SET"
        const val ACTION_START_HOLD = "org.bocken.app.workout.START_HOLD"
        const val ACTION_MIRROR_HOLD = "org.bocken.app.workout.MIRROR_HOLD"
        const val ACTION_STOP_HOLD = "org.bocken.app.workout.STOP_HOLD"
        const val ACTION_ADJUST_REST = "org.bocken.app.workout.ADJUST_REST"
        const val ACTION_STOP = "org.bocken.app.workout.STOP"

        const val EXTRA_STATE = "state"
        const val EXTRA_REST_ENDS_AT = "restEndsAt"
        const val EXTRA_REST_TOTAL = "restTotalSecs"
        const val EXTRA_HOLD_ENDS_AT = "holdEndsAt"
        const val EXTRA_HOLD_TOTAL = "holdTotalSecs"
        const val EXTRA_DELTA = "deltaSecs"

        @Volatile
        var running = false
            private set

        var instance: WorkoutForegroundService? = null
            private set

        /** Queue of events for JS to replay. Each is a JSON object with a `type`. */
        private val actionQueue = Collections.synchronizedList(mutableListOf<JSONObject>())

        /** Return + clear the queued events as a JSON array string (poll pattern). */
        fun drainActions(): String {
            val drained: List<JSONObject>
            synchronized(actionQueue) {
                drained = ArrayList(actionQueue)
                actionQueue.clear()
            }
            val arr = JSONArray()
            for (a in drained) arr.put(a)
            return arr.toString()
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        notificationManager = getSystemService(NotificationManager::class.java)

        val notifIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("navigateTo", "/fitness/workout/active")
        }
        pendingIntent = PendingIntent.getActivity(
            this, 0, notifIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // A null intent means a system restart of the (START_NOT_STICKY) service;
        // nothing to do — JS re-establishes state on next foreground.
        intent ?: return START_NOT_STICKY
        val act = intent.action

        // Parse a pushed shadow before building the notification so the first
        // frame shows the right set (avoids an empty flash).
        if (act == ACTION_START || act == ACTION_UPDATE) {
            intent.getStringExtra(EXTRA_STATE)?.let { applyState(it) }
        }

        // Every delivery arrives via startForegroundService(), so we MUST call
        // startForeground() promptly on the first one or Android kills the app —
        // do it unconditionally when not yet foregrounded, whatever the action.
        if (!running) {
            startForegroundNotification()
            running = true
            instance = this
        }

        when (act) {
            ACTION_START, ACTION_UPDATE -> {
                updateNotification()
                // A pushed state may also carry the authoritative rest end time.
                if (intent.hasExtra(EXTRA_REST_ENDS_AT)) {
                    applyRest(
                        intent.getLongExtra(EXTRA_REST_ENDS_AT, 0L),
                        intent.getIntExtra(EXTRA_REST_TOTAL, 0)
                    )
                }
            }
            ACTION_START_REST -> applyRest(
                intent.getLongExtra(EXTRA_REST_ENDS_AT, 0L),
                intent.getIntExtra(EXTRA_REST_TOTAL, 0)
            )
            ACTION_STOP_REST -> applyRest(0L, 0)
            ACTION_COMPLETE_SET -> finishCurrentSet()
            ACTION_START_HOLD -> onStartHold()
            ACTION_MIRROR_HOLD -> applyMirrorHold(
                intent.getLongExtra(EXTRA_HOLD_ENDS_AT, 0L),
                intent.getIntExtra(EXTRA_HOLD_TOTAL, 0)
            )
            ACTION_STOP_HOLD -> clearMirrorHold()
            ACTION_ADJUST_REST -> onAdjustRest(intent.getIntExtra(EXTRA_DELTA, 0))
            ACTION_STOP -> {
                stopSelfCleanly()
                return START_NOT_STICKY
            }
            else -> {}
        }
        // If the process is killed while backgrounded we don't try to resurrect
        // the service — JS re-establishes it on next foreground (matches the
        // "backgrounded/screen-off" robustness target, not survive-full-kill).
        return START_NOT_STICKY
    }

    // --- State pushed from JS ------------------------------------------------

    /** Replace the remaining-sets shadow from the JSON JS pushed. */
    private fun applyState(json: String) {
        try {
            val obj = JSONObject(json)
            val arr = obj.optJSONArray("sets") ?: JSONArray()
            remaining.clear()
            for (i in 0 until arr.length()) {
                val s = arr.getJSONObject(i)
                remaining.add(
                    SetInfo(
                        exerciseIdx = s.getInt("exerciseIdx"),
                        setIdx = s.getInt("setIdx"),
                        exerciseName = s.optString("exerciseName", "Exercise"),
                        setLabel = s.optString("setLabel", ""),
                        weight = if (s.isNull("weight")) null else s.optDouble("weight"),
                        reps = if (s.isNull("reps")) null else s.optInt("reps"),
                        isDuration = s.optBoolean("isDuration", false),
                        holdSecs = s.optInt("holdSecs", 0),
                        restSecs = s.optInt("restSecs", 120)
                    )
                )
            }
        } catch (_: Exception) {}
    }

    /** Adopt the authoritative rest window from JS and (re)schedule the beep. */
    private fun applyRest(endsAt: Long, totalSecs: Int) {
        cancelRestRunnable()
        restEndsAt = endsAt
        restTotalSecs = totalSecs
        if (endsAt > System.currentTimeMillis()) {
            scheduleRestBeep(endsAt - System.currentTimeMillis())
            startProgressTicker()
        }
        updateNotification()
    }

    // --- Notification actions ------------------------------------------------

    /** Complete the current set (from "Complete set", "Finish", or a hold ending):
     *  queue the completion for JS, advance the shadow, and start the rest. */
    private fun finishCurrentSet() {
        val current = remaining.firstOrNull() ?: return
        val now = System.currentTimeMillis()
        val total = current.restSecs
        // Queue the completion for JS to replay (with the assumed prefill values).
        val ev = JSONObject().apply {
            put("type", "complete")
            put("exerciseIdx", current.exerciseIdx)
            put("setIdx", current.setIdx)
            if (current.weight != null) put("weight", current.weight) else put("weight", JSONObject.NULL)
            if (current.reps != null) put("reps", current.reps) else put("reps", JSONObject.NULL)
            put("restStartedAt", now)
            put("restTotal", total)
        }
        actionQueue.add(ev)

        // Advance our shadow and start the next rest locally so the notification
        // and the beep keep working without the WebView.
        cancelHoldRunnable()
        holdEndsAt = 0L
        holdTotalSecs = 0
        remaining.removeAt(0)
        if (total > 0) {
            applyRest(now + total * 1000L, total)
        } else {
            applyRest(0L, 0)
        }
    }

    /** Start a timed hold (plank/stretch) for the current set from the
     *  notification. This service owns the countdown, so the end beep and the
     *  auto-complete work while backgrounded, mirroring the in-app hold timer. */
    private fun onStartHold() {
        val current = remaining.firstOrNull() ?: return
        if (!current.isDuration || current.holdSecs <= 0) {
            // Nothing to time — treat as a plain completion.
            finishCurrentSet()
            return
        }
        val now = System.currentTimeMillis()
        val secs = current.holdSecs
        cancelRestRunnable()
        restEndsAt = 0L
        holdEndsAt = now + secs * 1000L
        holdTotalSecs = secs
        // Let JS mirror the running hold (display only — this service completes it).
        actionQueue.add(JSONObject().apply {
            put("type", "holdStart")
            put("exerciseIdx", current.exerciseIdx)
            put("setIdx", current.setIdx)
            put("holdStartedAt", now)
            put("holdTotal", secs)
        })
        cancelHoldRunnable()
        val r = Runnable {
            playRestDoneBeep()
            forceVibrate(600L)
            // Hold done → complete the set and roll into its rest.
            finishCurrentSet()
        }
        holdRunnable = r
        handler.postDelayed(r, secs * 1000L)
        startProgressTicker()
        updateNotification()
    }

    private fun cancelHoldRunnable() {
        holdRunnable?.let { handler.removeCallbacks(it) }
        holdRunnable = null
    }

    /** Mirror a hold that the WebView started in-app: show the same countdown +
     *  bar and beep at the end (so it's audible while backgrounded), but do NOT
     *  complete — JS owns the completion/rest for in-app holds (avoids acting on
     *  the wrong set when a non-current exercise is focused). */
    private fun applyMirrorHold(endsAt: Long, totalSecs: Int) {
        cancelHoldRunnable()
        cancelRestRunnable()
        restEndsAt = 0L
        holdEndsAt = endsAt
        holdTotalSecs = totalSecs
        if (endsAt > System.currentTimeMillis()) {
            val r = Runnable {
                playRestDoneBeep()
                forceVibrate(600L)
                holdEndsAt = 0L
                holdTotalSecs = 0
                updateNotification()
            }
            holdRunnable = r
            handler.postDelayed(r, endsAt - System.currentTimeMillis())
            startProgressTicker()
        }
        updateNotification()
    }

    private fun clearMirrorHold() {
        cancelHoldRunnable()
        holdEndsAt = 0L
        holdTotalSecs = 0
        updateNotification()
    }

    /** Refresh the notification ~1×/sec so the progress bar decays; self-stops
     *  once neither a rest nor a hold is running. */
    private fun startProgressTicker() {
        stopProgressTicker()
        val r = object : Runnable {
            override fun run() {
                val now = System.currentTimeMillis()
                if (holdEndsAt > now || restEndsAt > now) {
                    updateNotification()
                    handler.postDelayed(this, 1000L)
                } else {
                    tickRunnable = null
                }
            }
        }
        tickRunnable = r
        handler.postDelayed(r, 1000L)
    }

    private fun stopProgressTicker() {
        tickRunnable?.let { handler.removeCallbacks(it) }
        tickRunnable = null
    }

    private fun onAdjustRest(deltaSecs: Int) {
        if (restEndsAt <= 0L) return
        val newEnds = (restEndsAt + deltaSecs * 1000L).coerceAtLeast(System.currentTimeMillis())
        val newTotal = (restTotalSecs + deltaSecs).coerceAtLeast(1)
        actionQueue.add(JSONObject().apply {
            put("type", "restAdjust")
            put("endsAt", newEnds)
            put("total", newTotal)
        })
        applyRest(newEnds, newTotal)
    }

    // --- Rest beep -----------------------------------------------------------

    private fun scheduleRestBeep(delayMs: Long) {
        val r = Runnable {
            playRestDoneBeep()
            forceVibrate(600L)
            restEndsAt = 0L
            restTotalSecs = 0
            updateNotification()
        }
        restRunnable = r
        handler.postDelayed(r, delayMs.coerceAtLeast(0L))
    }

    private fun cancelRestRunnable() {
        restRunnable?.let { handler.removeCallbacks(it) }
        restRunnable = null
    }

    /** Double alarm-stream beep — audible even when the app is backgrounded and
     *  through most silent/vibrate states (alarm stream), mirroring the JS cue. */
    private fun playRestDoneBeep() {
        try {
            val tg = ToneGenerator(AudioManager.STREAM_ALARM, 100)
            tg.startTone(ToneGenerator.TONE_PROP_BEEP, 200)
            handler.postDelayed({
                try {
                    tg.startTone(ToneGenerator.TONE_PROP_BEEP, 200)
                } catch (_: Exception) {}
                handler.postDelayed({ try { tg.release() } catch (_: Exception) {} }, 400)
            }, 300)
        } catch (_: Exception) {}
    }

    private fun forceVibrate(durationMs: Long) {
        val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
        if (vibrator?.hasVibrator() != true) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val effect = VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE)
            val attrs = VibrationAttributes.Builder()
                .setUsage(VibrationAttributes.USAGE_ALARM)
                .build()
            vibrator.vibrate(effect, attrs)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(durationMs)
        }
    }

    // --- Notification --------------------------------------------------------

    private fun startForegroundNotification() {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID, notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun updateNotification() {
        if (!running) return
        notificationManager?.notify(NOTIFICATION_ID, buildNotification())
    }

    private fun action(actionName: String, title: String, requestCode: Int, delta: Int = 0): Notification.Action {
        val intent = Intent(this, WorkoutForegroundService::class.java).apply {
            action = actionName
            if (delta != 0) putExtra(EXTRA_DELTA, delta)
        }
        val pi = PendingIntent.getService(
            this, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return Notification.Action.Builder(null as android.graphics.drawable.Icon?, title, pi).build()
    }

    private fun buildNotification(): Notification {
        val current = remaining.firstOrNull()
        val nowMs = System.currentTimeMillis()
        val holding = holdEndsAt > nowMs
        val resting = restEndsAt > nowMs

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        builder
            .setSmallIcon(android.R.drawable.ic_menu_agenda)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            // Frequent notify() updates must not replay the channel alert; the
            // rest/hold beep is played manually. Matches the GPS notification.
            .setOnlyAlertOnce(true)

        when {
            current == null -> {
                builder.setContentTitle("Workout complete")
                    .setContentText("All sets done — tap to finish")
            }
            holding -> {
                val t = "Holding · ${current.exerciseName}"
                val txt = current.setLabel
                builder.setContentTitle(t).setContentText(txt)
                setCountdown(builder, holdEndsAt, holdTotalSecs)
                builder.setStyle(Notification.DecoratedCustomViewStyle())
                    .setCustomBigContentView(timerBigView(t, txt, holdEndsAt, holdTotalSecs))
                builder.addAction(action(ACTION_COMPLETE_SET, "Finish", 10))
            }
            resting -> {
                val t = "Rest"
                val txt = "Next: ${current.exerciseName} · ${current.setLabel} · ${setDetail(current)}"
                builder.setContentTitle(t).setContentText(txt)
                setCountdown(builder, restEndsAt, restTotalSecs)
                builder.setStyle(Notification.DecoratedCustomViewStyle())
                    .setCustomBigContentView(timerBigView(t, txt, restEndsAt, restTotalSecs))
                builder.addAction(action(ACTION_ADJUST_REST, "+30s", 11, 30))
                builder.addAction(action(ACTION_ADJUST_REST, "−30s", 12, -30))
            }
            else -> {
                builder.setContentTitle("${current.exerciseName} · ${current.setLabel}")
                    .setContentText(setDetail(current))
                if (current.isDuration && current.holdSecs > 0) {
                    builder.addAction(action(ACTION_START_HOLD, "Start", 13))
                } else {
                    builder.addAction(action(ACTION_COMPLETE_SET, "Complete set", 10))
                }
            }
        }
        return builder.build()
    }

    /** Render a live count-down to [endsAt]: a system-driven chronometer in the
     *  time slot (ticks itself, even backgrounded) plus a decaying progress bar
     *  (remaining/total) that the progress ticker refreshes ~1×/sec. */
    private fun setCountdown(builder: Notification.Builder, endsAt: Long, totalSecs: Int) {
        builder.setWhen(endsAt).setShowWhen(true).setUsesChronometer(true)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            builder.setChronometerCountDown(true)
        }
        if (totalSecs > 0) {
            val remaining = ((endsAt - System.currentTimeMillis()) / 1000)
                .coerceIn(0L, totalSecs.toLong())
            builder.setProgress(totalSecs, remaining.toInt(), false)
        }
    }

    /** Expanded body: a wide progress bar with the live count-down chronometer
     *  beside it. The chronometer ticks itself; the bar is refreshed by the
     *  progress ticker (setProgress isn't animated by the system). */
    private fun timerBigView(title: String, text: String, endsAt: Long, totalSecs: Int): RemoteViews {
        val rv = RemoteViews(packageName, R.layout.workout_timer_big)
        rv.setTextViewText(R.id.wp_title, title)
        rv.setTextViewText(R.id.wp_text, text)
        if (totalSecs > 0) {
            val remaining = ((endsAt - System.currentTimeMillis()) / 1000)
                .coerceIn(0L, totalSecs.toLong())
            rv.setProgressBar(R.id.wp_bar, totalSecs, remaining.toInt(), false)
        }
        val base = SystemClock.elapsedRealtime() + (endsAt - System.currentTimeMillis())
        rv.setChronometer(R.id.wp_chrono, base, null, true)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            rv.setChronometerCountDown(R.id.wp_chrono, true)
        }
        return rv
    }

    private fun setDetail(s: SetInfo): String {
        if (s.isDuration) {
            return if (s.holdSecs > 0) "Hold ${formatMs(s.holdSecs.toLong())}" else "Timed hold"
        }
        val w = s.weight
        val r = s.reps
        val wStr = if (w != null && w > 0) (if (w % 1.0 == 0.0) "${w.toInt()} kg" else "$w kg") else null
        val rStr = if (r != null && r > 0) "$r reps" else null
        return listOfNotNull(wStr, rStr).joinToString(" × ").ifEmpty { "Tap to log" }
    }

    private fun formatMs(secs: Long): String {
        val m = secs / 60
        val s = secs % 60
        return "%d:%02d".format(m, s)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Active Workout",
                // DEFAULT to match the GPS-tracking channel (audible on first
                // post). Frequent updates don't re-alert because buildNotification
                // sets setOnlyAlertOnce(true).
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Shows your current set and rest timer during a workout"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }

    private fun stopSelfCleanly() {
        cancelRestRunnable()
        cancelHoldRunnable()
        stopProgressTicker()
        running = false
        instance = null
        remaining.clear()
        restEndsAt = 0L
        holdEndsAt = 0L
        holdTotalSecs = 0
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    override fun onDestroy() {
        cancelRestRunnable()
        cancelHoldRunnable()
        stopProgressTicker()
        running = false
        instance = null
        super.onDestroy()
    }
}
