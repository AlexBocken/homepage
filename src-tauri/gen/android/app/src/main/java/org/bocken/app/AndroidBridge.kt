package org.bocken.app

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.webkit.JavascriptInterface
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class AndroidBridge(private val context: Context) {

    @JavascriptInterface
    fun startLocationService() {
        // Request background location if not yet granted (Android 10+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                != PackageManager.PERMISSION_GRANTED
            ) {
                if (context is Activity) {
                    ActivityCompat.requestPermissions(
                        context,
                        arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION),
                        1002
                    )
                }
            }
        }

        val intent = Intent(context, LocationForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
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
}
