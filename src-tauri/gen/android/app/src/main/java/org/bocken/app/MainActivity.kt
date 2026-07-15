package org.bocken.app

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {

  companion object {
    /** Route stashed by a notification tap, consumed once by the WebView via
     *  AndroidBridge.consumePendingRoute() (native→JS is poll-based here). */
    @Volatile
    private var pendingRoute: String? = null

    fun consumePendingRoute(): String {
      val r = pendingRoute
      pendingRoute = null
      return r ?: ""
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    captureRoute(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    captureRoute(intent)
  }

  private fun captureRoute(intent: Intent?) {
    intent?.getStringExtra("navigateTo")?.let { if (it.isNotEmpty()) pendingRoute = it }
  }

  override fun onWebViewCreate(webView: WebView) {
    webView.addJavascriptInterface(AndroidBridge(this), "AndroidBridge")
  }

  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<out String>,
    grantResults: IntArray
  ) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode == AndroidBridge.REQ_ACTIVITY_RECOGNITION &&
        grantResults.isNotEmpty() &&
        grantResults[0] == PackageManager.PERMISSION_GRANTED) {
      LocationForegroundService.instance?.onActivityRecognitionGranted()
    }
  }
}
