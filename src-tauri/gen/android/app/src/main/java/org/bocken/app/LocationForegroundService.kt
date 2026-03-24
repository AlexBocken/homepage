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
import android.os.IBinder
import org.json.JSONArray
import org.json.JSONObject
import java.util.Collections
import kotlin.math.*

class LocationForegroundService : Service() {

    private var locationManager: LocationManager? = null
    private var locationListener: LocationListener? = null
    private var notificationManager: NotificationManager? = null
    private var pendingIntent: PendingIntent? = null
    private var startTimeMs: Long = 0L
    private var lastLat: Double = Double.NaN
    private var lastLng: Double = Double.NaN
    private var lastTimestamp: Long = 0L
    private var currentPaceMinKm: Double = 0.0

    companion object {
        const val CHANNEL_ID = "gps_tracking"
        const val NOTIFICATION_ID = 1001
        const val MIN_TIME_MS = 3000L
        const val MIN_DISTANCE_M = 0f

        private val pointBuffer = Collections.synchronizedList(mutableListOf<JSONObject>())
        var tracking = false
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
        totalDistanceKm = 0.0
        lastLat = Double.NaN
        lastLng = Double.NaN
        lastTimestamp = 0L
        currentPaceMinKm = 0.0

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

        return START_STICKY
    }

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

    private fun formatElapsed(): String {
        val secs = (System.currentTimeMillis() - startTimeMs) / 1000
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

            // Accumulate distance and compute pace
            val now = location.time
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

            val point = JSONObject().apply {
                put("lat", lat)
                put("lng", lng)
                if (location.hasAltitude()) put("altitude", location.altitude)
                if (location.hasSpeed()) put("speed", location.speed.toDouble())
                put("timestamp", location.time)
            }
            pointBuffer.add(point)

            updateNotification()
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
        locationListener?.let { locationManager?.removeUpdates(it) }
        locationListener = null
        locationManager = null
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
