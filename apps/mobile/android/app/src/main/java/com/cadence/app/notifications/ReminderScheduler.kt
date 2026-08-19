package com.cadence.app.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.cadence.app.network.dto.AnchorDto
import java.time.LocalDate
import java.time.LocalTime

internal const val EXTRA_TITLE = "title"
internal const val EXTRA_BODY = "body"

/** Schedule-block reminders -- ports apps/web/src/app/dashboard/layout.tsx's
 * anchor-notification effect (a start-soon nudge 5 minutes before every
 * applicable anchor, an end-soon nudge 15 minutes before a fixed/non-focus
 * block ends) to AlarmManager instead of a setInterval poll, since an
 * Android app isn't a tab that's guaranteed to stay open. Deliberately uses
 * the *inexact* `setAndAllowWhileIdle` rather than an exact alarm: a
 * reminder landing a minute or two late is fine, and inexact alarms need no
 * special "Alarms & reminders" user grant (unlike setExactAndAllowWhileIdle
 * on API 33+), which would be a heavy ask for a nice-to-have nudge. */
object ReminderScheduler {
    private const val START_LEAD_MINUTES = 5
    private const val END_LEAD_MINUTES = 15

    fun reschedule(context: Context, anchors: List<AnchorDto>, enabled: Boolean) {
        val alarmManager = context.getSystemService(AlarmManager::class.java) ?: return
        cancelAll(context, alarmManager, anchors)
        if (!enabled) return

        val today = LocalDate.now()
        val jsDayOfWeek = today.dayOfWeek.value % 7 // ISO Monday=1..Sunday=7 -> JS Sunday=0..Saturday=6
        val nowMinutes = LocalTime.now().let { it.hour * 60 + it.minute }

        for (anchor in anchors) {
            if (!appliesOn(anchor, today, jsDayOfWeek)) continue

            val startMinutes = parseMinutes(anchor.start) ?: continue
            scheduleIfFuture(
                context, alarmManager, requestCode(anchor.id, "start"),
                triggerMinutes = startMinutes - START_LEAD_MINUTES, nowMinutes = nowMinutes,
                title = "${anchor.label} starts soon", body = "${anchor.start}–${anchor.end}",
            )

            if (!anchor.isFocusBlock) {
                val endMinutes = parseMinutes(anchor.end) ?: continue
                scheduleIfFuture(
                    context, alarmManager, requestCode(anchor.id, "end"),
                    triggerMinutes = endMinutes - END_LEAD_MINUTES, nowMinutes = nowMinutes,
                    title = "${anchor.label} ends soon", body = "Ends at ${anchor.end}",
                )
            }
        }
    }

    private fun appliesOn(anchor: AnchorDto, today: LocalDate, jsDayOfWeek: Int): Boolean = when (anchor.recurrence) {
        "once" -> anchor.date == today.toString()
        "weekly" -> anchor.daysOfWeek.contains(jsDayOfWeek)
        else -> true // daily
    }

    private fun parseMinutes(hhmm: String): Int? {
        val parts = hhmm.split(":")
        val hour = parts.getOrNull(0)?.toIntOrNull() ?: return null
        val minute = parts.getOrNull(1)?.toIntOrNull() ?: return null
        return hour * 60 + minute
    }

    private fun scheduleIfFuture(
        context: Context,
        alarmManager: AlarmManager,
        requestCode: Int,
        triggerMinutes: Int,
        nowMinutes: Int,
        title: String,
        body: String,
    ) {
        val minutesUntilTrigger = triggerMinutes - nowMinutes
        if (minutesUntilTrigger < 0) return // already past for today -- next occurrence picked up tomorrow's reschedule
        val triggerAtMillis = System.currentTimeMillis() + minutesUntilTrigger * 60_000L
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra(EXTRA_TITLE, title)
            putExtra(EXTRA_BODY, body)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
    }

    private fun cancelAll(context: Context, alarmManager: AlarmManager, anchors: List<AnchorDto>) {
        for (anchor in anchors) {
            for (type in listOf("start", "end")) {
                val intent = Intent(context, ReminderReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context, requestCode(anchor.id, type), intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
                alarmManager.cancel(pendingIntent)
            }
        }
    }

    private fun requestCode(anchorId: String, type: String): Int = (anchorId + type).hashCode()
}
