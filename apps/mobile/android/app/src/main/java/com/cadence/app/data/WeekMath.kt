package com.cadence.app.data

import com.cadence.app.network.dto.SessionDto
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

/** Mirrors apps/web/src/lib/store.tsx's `startOfWeekISO`/`weeklyMinutes`/
 * `weeklySessionCount`/`previousWeeklyMinutes`/`previousWeeklySessionCount`
 * exactly (Monday week start per spec §104, and the >=45min-counts-as-a-
 * session rule per spec §7.2) so the two clients never disagree about "this
 * week" for the same account. */
object WeekMath {
    private const val SESSION_MIN_MINUTES = 45

    fun startOfWeek(today: LocalDate = LocalDate.now()): LocalDate =
        today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

    fun weeklyMinutes(sessions: List<SessionDto>, categoryId: String, today: LocalDate = LocalDate.now()): Int {
        val weekStart = startOfWeek(today)
        return sessions
            .asSequence()
            .filter { it.categoryId == categoryId && LocalDate.parse(it.date) >= weekStart }
            .sumOf { it.durationMinutes }
    }

    fun weeklySessionCount(sessions: List<SessionDto>, categoryId: String, today: LocalDate = LocalDate.now()): Int {
        val weekStart = startOfWeek(today)
        return sessions.count {
            it.categoryId == categoryId && it.durationMinutes >= SESSION_MIN_MINUTES && LocalDate.parse(it.date) >= weekStart
        }
    }

    /** Reference point for no-target categories (spec has no "minimum" to
     * compare against) instead of always showing 0 progress for them --
     * see TodayScreen.kt's CategoryProgressRow. */
    fun previousWeeklyMinutes(sessions: List<SessionDto>, categoryId: String, today: LocalDate = LocalDate.now()): Int {
        val thisWeekStart = startOfWeek(today)
        val lastWeekStart = thisWeekStart.minusDays(7)
        return sessions
            .asSequence()
            .filter {
                it.categoryId == categoryId &&
                    LocalDate.parse(it.date) >= lastWeekStart &&
                    LocalDate.parse(it.date) < thisWeekStart
            }
            .sumOf { it.durationMinutes }
    }

    fun previousWeeklySessionCount(sessions: List<SessionDto>, categoryId: String, today: LocalDate = LocalDate.now()): Int {
        val thisWeekStart = startOfWeek(today)
        val lastWeekStart = thisWeekStart.minusDays(7)
        return sessions.count {
            it.categoryId == categoryId &&
                it.durationMinutes >= SESSION_MIN_MINUTES &&
                LocalDate.parse(it.date) >= lastWeekStart &&
                LocalDate.parse(it.date) < thisWeekStart
        }
    }
}
