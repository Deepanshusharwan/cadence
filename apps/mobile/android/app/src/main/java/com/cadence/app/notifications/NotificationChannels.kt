package com.cadence.app.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context

object NotificationChannels {
    const val REMINDERS = "cadence_reminders"
    const val TIMER = "cadence_timer"

    /** Called once from CadenceApplication.onCreate() -- channels are a
     * one-time system registration, safe to call repeatedly (createNotificationChannel
     * is a no-op if the channel already exists with the same id). */
    fun ensureCreated(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        manager.createNotificationChannel(
            NotificationChannel(REMINDERS, "Schedule reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "A nudge shortly before a schedule block starts or a fixed block ends"
            },
        )
        manager.createNotificationChannel(
            NotificationChannel(TIMER, "Running timer", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Shows the elapsed time while a session is running"
            },
        )
    }
}
