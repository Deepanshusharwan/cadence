package com.cadence.app.notifications

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.cadence.app.MainActivity
import com.cadence.app.R

/** "The timer also shows in the notifications" -- an ongoing (non-dismissable
 * by swipe) notification updated as TimerViewModel's tick loop advances, so
 * the running session is visible from the notification shade without a
 * foreground Service. That's a deliberate scope trade: a true foreground
 * service survives the app process being killed by the OS, which this
 * doesn't, but it also avoids the foregroundServiceType/battery-exemption
 * ceremony Android 14+ demands for one -- acceptable for a "nice to see
 * it while I'm doing other things" nudge, not a strict requirement. */
object TimerNotifier {
    private const val NOTIFICATION_ID = 42

    fun update(context: Context, itemLabel: String, elapsedSeconds: Int) {
        if (!hasPermission(context)) return
        val minutes = elapsedSeconds / 60
        val seconds = elapsedSeconds % 60
        val contentIntent = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, NotificationChannels.TIMER)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(itemLabel)
            .setContentText("%02d:%02d elapsed".format(minutes, seconds))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(contentIntent)
            .build()
        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    }

    fun clear(context: Context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }

    private fun hasPermission(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
    }
}
