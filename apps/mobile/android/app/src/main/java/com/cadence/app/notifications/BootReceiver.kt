package com.cadence.app.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.cadence.app.CadenceApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/** Inexact alarms don't survive a reboot -- reschedule from whatever
 * anchors/notifications_enabled are already cached locally (no network
 * round-trip needed, matching CadenceRepository's own cache-first read
 * pattern from docs/architecture.md §4). */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val pendingResult = goAsync()
        val appContext = context.applicationContext
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val container = (appContext as CadenceApplication).container
                val anchors = container.repository.anchors.first()
                val enabled = container.repository.profile.first()?.notificationsEnabled ?: false
                ReminderScheduler.reschedule(appContext, anchors, enabled)
            } finally {
                pendingResult.finish()
            }
        }
    }
}
