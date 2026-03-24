package org.bocken.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import org.json.JSONArray
import org.json.JSONObject
import java.util.Collections

class LocationForegroundService : Service() {

    private var locationManager: LocationManager? = null
    private var locationListener: LocationListener? = null

    companion object {
        const val CHANNEL_ID = "gps_tracking"
        const val NOTIFICATION_ID = 1001
        const val MIN_TIME_MS = 3000L
        const val MIN_DISTANCE_M = 0f

        private val pointBuffer = Collections.synchronizedList(mutableListOf<JSONObject>())
        var tracking = false
            private set

        /** Drain all accumulated points and return as JSON string. Clears the buffer. */
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
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notificationIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("GPS Tracking")
                .setContentText("Recording your workout route")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("GPS Tracking")
                .setContentText("Recording your workout route")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        startLocationUpdates()
        tracking = true

        return START_STICKY
    }

    @Suppress("MissingPermission")
    private fun startLocationUpdates() {
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager

        locationListener = LocationListener { location ->
            val point = JSONObject().apply {
                put("lat", location.latitude)
                put("lng", location.longitude)
                if (location.hasAltitude()) put("altitude", location.altitude)
                if (location.hasSpeed()) put("speed", location.speed.toDouble())
                put("timestamp", location.time)
            }
            pointBuffer.add(point)
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
