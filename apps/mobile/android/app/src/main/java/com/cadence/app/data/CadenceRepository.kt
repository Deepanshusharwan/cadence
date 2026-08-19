package com.cadence.app.data

import android.content.Context
import com.cadence.app.data.local.CadenceLocalStore
import com.cadence.app.data.local.PendingDayEntry
import com.cadence.app.data.local.PendingSession
import com.cadence.app.network.ApiResult
import com.cadence.app.network.ApiService
import com.cadence.app.network.apiCall
import com.cadence.app.network.dto.AnchorCreateDto
import com.cadence.app.network.dto.AnchorUpdateDto
import com.cadence.app.network.dto.CategoryCreateDto
import com.cadence.app.network.dto.CategoryUpdateDto
import com.cadence.app.network.dto.DayEntrySetDto
import com.cadence.app.network.dto.EventCreateDto
import com.cadence.app.network.dto.ReviewUpsertDto
import com.cadence.app.network.dto.SessionCreateDto
import com.cadence.app.network.dto.UserUpdateDto
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Orchestrates network + local cache (docs/architecture.md §4): every screen
 * reads from [CadenceLocalStore] first -- so the app renders whatever it
 * last saw even with no connection -- then [refreshAll] opportunistically
 * updates that cache in the background (full-refetch on foreground rather
 * than the delta `/changes` cursor the architecture doc describes but the
 * backend doesn't implement yet). The two actions the architecture doc
 * calls out as needing to actually *work* offline -- logging a session and
 * marking a day reduced/leave -- go through an outbox instead of a plain
 * network call, same pattern, two queues.
 */
class CadenceRepository(
    private val api: ApiService,
    private val local: CadenceLocalStore,
    private val appContext: Context,
) {
    val profile = local.cachedProfile
    val categories = local.cachedCategories
    val todaySchedule = local.cachedTodaySchedule
    val leaveBalance = local.cachedLeaveBalance
    val sessions = local.cachedSessions
    val anchors = local.cachedAnchors
    val events = local.cachedEvents
    val dayTypes = local.cachedDayTypes
    val streaks = local.cachedStreaks
    val insights = local.cachedInsights
    val longTermTrend = local.cachedLongTermTrend
    val reviews = local.cachedReviews
    val weekSchedule = local.cachedWeekSchedule
    val pendingSessions = local.pendingSessions
    val pendingDayEntries = local.pendingDayEntries

    suspend fun refreshAll(): ApiResult<Unit> = apiCall {
        coroutineScope {
            launch { local.saveProfile(api.getMe()) }
            launch { local.saveCategories(api.getCategories()) }
            launch { local.saveTodaySchedule(api.getToday()) }
            launch { local.saveLeaveBalance(api.getLeaveBalance()) }
            launch { local.saveSessions(api.getSessions()) }
            launch { local.saveAnchors(api.getAnchors()) }
            launch { local.saveEvents(api.getEvents()) }
            launch { local.saveDayTypes(api.getDayTypes().associate { it.date to it.dayType }) }
            launch { local.saveStreaks(api.getStreaks()) }
            launch { local.saveInsights(api.getInsights()) }
        }
    }

    /** Plus-only (backend's `require_plus`) -- called separately from
     * [refreshAll] rather than unconditionally, since a free-plan account
     * would just 403 on every refresh. */
    suspend fun refreshLongTermTrend(): ApiResult<Unit> = apiCall {
        local.saveLongTermTrend(api.getLongTermTrend())
    }

    // --- Session logging (offline-critical) --------------------------------

    /** Queues a session locally first (so Start/Stop always feels instant,
     * offline or not), then tries to flush immediately. If that fails the
     * entry just stays in the outbox for [flushSessionOutbox] to pick up
     * later (see data/SessionSyncWorker.kt). */
    suspend fun logSession(categoryId: String, date: String, durationMinutes: Int, tags: List<String> = emptyList()) {
        local.enqueuePendingSession(
            PendingSession(categoryId = categoryId, date = date, durationMinutes = durationMinutes, tags = tags)
        )
        val result = flushSessionOutbox()
        if (result is ApiResult.Failure) {
            SessionSyncWorker.enqueue(appContext)
        }
    }

    suspend fun flushSessionOutbox(): ApiResult<Unit> = apiCall {
        val pending = local.pendingSessions.first()
        for (item in pending) {
            val created = api.createSession(
                SessionCreateDto(
                    categoryId = item.categoryId,
                    date = item.date,
                    durationMinutes = item.durationMinutes,
                    tags = item.tags,
                )
            )
            local.removePendingSession(item.clientId)
            local.saveSessions(local.cachedSessions.first() + created)
        }
    }

    // --- Day type / leave marking (offline-critical) ------------------------

    /** Same shape as [logSession]: update the local day-type map immediately
     * (so the UI reflects the mark right away), queue it, then try to flush.
     * A day only ever has one type, so a second mark before the first
     * flushes just replaces the queued one (see PendingDayEntry). */
    suspend fun setDayType(date: String, dayType: String) {
        local.saveDayTypes(local.cachedDayTypes.first() + (date to dayType))
        local.enqueuePendingDayEntry(PendingDayEntry(date = date, dayType = dayType))
        val result = flushDayEntryOutbox()
        if (result is ApiResult.Failure) {
            SessionSyncWorker.enqueue(appContext)
        }
    }

    suspend fun flushDayEntryOutbox(): ApiResult<Unit> = apiCall {
        val pending = local.pendingDayEntries.first()
        for (item in pending) {
            val saved = api.setDayType(item.date, DayEntrySetDto(dayType = item.dayType))
            local.removePendingDayEntry(item.date)
            local.saveDayTypes(local.cachedDayTypes.first() + (saved.date to saved.dayType))
        }
        // A day-type change affects server-computed leave/streaks/schedule
        // (mirrors apps/web/src/lib/store.tsx's setDayType -> refreshComputed
        // chain) -- only worth re-pulling if something actually flushed.
        if (pending.isNotEmpty()) {
            local.saveLeaveBalance(api.getLeaveBalance())
            local.saveStreaks(api.getStreaks())
            local.saveTodaySchedule(api.getToday())
        }
    }

    // --- Profile (name/avatar/accent color/etc) -----------------------------

    /** Just `GET /me` -- used to resolve onboarded/routing state right after
     * sign-in, before any screen that would trigger the full [refreshAll]
     * has been shown (e.g. Setup, which replaces the whole app while
     * onboarded is false). */
    suspend fun refreshProfile(): ApiResult<Unit> = apiCall {
        local.saveProfile(api.getMe())
    }

    suspend fun updateProfile(patch: UserUpdateDto): ApiResult<Unit> = apiCall {
        local.saveProfile(api.updateMe(patch))
    }

    // --- Items (categories) -- not offline-critical, plain network calls ---

    suspend fun createCategory(
        name: String,
        trackingMode: String,
        weeklyTarget: Double?,
        priorityTier: Int,
        weekendPreferred: Boolean,
    ): ApiResult<Unit> = apiCall {
        val created = api.createCategory(
            CategoryCreateDto(name, trackingMode, weeklyTarget, priorityTier, weekendPreferred)
        )
        local.saveCategories(local.cachedCategories.first() + created)
    }

    suspend fun updateCategory(id: String, patch: CategoryUpdateDto): ApiResult<Unit> = apiCall {
        val updated = api.updateCategory(id, patch)
        local.saveCategories(local.cachedCategories.first().map { if (it.id == id) updated else it })
    }

    suspend fun deleteCategory(id: String): ApiResult<Unit> = apiCall {
        api.deleteCategory(id)
        local.saveCategories(local.cachedCategories.first().filterNot { it.id == id })
    }

    // --- Anchors -------------------------------------------------------------

    suspend fun createAnchor(body: AnchorCreateDto): ApiResult<Unit> = apiCall {
        val created = api.createAnchor(body)
        local.saveAnchors(local.cachedAnchors.first() + created)
    }

    suspend fun updateAnchor(id: String, body: AnchorUpdateDto): ApiResult<Unit> = apiCall {
        val updated = api.updateAnchor(id, body)
        local.saveAnchors(local.cachedAnchors.first().map { if (it.id == id) updated else it })
    }

    suspend fun deleteAnchor(id: String): ApiResult<Unit> = apiCall {
        api.deleteAnchor(id)
        local.saveAnchors(local.cachedAnchors.first().filterNot { it.id == id })
    }

    // --- Events ----------------------------------------------------------------

    suspend fun createEvent(body: EventCreateDto): ApiResult<Unit> = apiCall {
        val created = api.createEvent(body)
        local.saveEvents(local.cachedEvents.first() + created)
    }

    suspend fun deleteEvent(id: String): ApiResult<Unit> = apiCall {
        api.deleteEvent(id)
        local.saveEvents(local.cachedEvents.first().filterNot { it.id == id })
    }

    // --- Weekly review ---------------------------------------------------------

    suspend fun loadReview(weekStart: String): ApiResult<Unit> = apiCall {
        local.saveReview(weekStart, api.getWeeklyReview(weekStart))
    }

    suspend fun saveReview(weekStart: String, wins: String, problems: String, nextWeekChanges: String): ApiResult<Unit> =
        apiCall {
            val saved = api.setWeeklyReview(weekStart, ReviewUpsertDto(wins, problems, nextWeekChanges))
            local.saveReview(weekStart, saved)
        }

    // --- Calendar (week view) ---------------------------------------------------

    /** One `GET /today?on_date=` per day rather than reimplementing the
     * planner's ranking logic client-side -- scheduling stays server-side
     * per docs/architecture.md §2. [weekStartDates] are ISO date strings. */
    suspend fun refreshWeek(weekStartDates: List<String>): ApiResult<Unit> = apiCall {
        coroutineScope {
            weekStartDates.forEach { date ->
                launch { local.saveWeekScheduleDay(date, api.getToday(date)) }
            }
        }
    }

    suspend fun signOutCleanup() = local.clearAll()
}
