package com.cadence.app.data

import android.content.Context
import com.cadence.app.data.local.CadenceLocalStore
import com.cadence.app.data.local.PendingAnchorCreate
import com.cadence.app.data.local.PendingAnchorDelete
import com.cadence.app.data.local.PendingAnchorUpdate
import com.cadence.app.data.local.PendingCategoryCreate
import com.cadence.app.data.local.PendingCategoryDelete
import com.cadence.app.data.local.PendingCategoryUpdate
import com.cadence.app.data.local.PendingDayEntry
import com.cadence.app.data.local.PendingEventCreate
import com.cadence.app.data.local.PendingEventDelete
import com.cadence.app.data.local.PendingProfileUpdate
import com.cadence.app.data.local.PendingReviewSave
import com.cadence.app.data.local.PendingSession
import com.cadence.app.network.ApiResult
import com.cadence.app.network.ApiService
import com.cadence.app.network.dto.AnchorCreateDto
import com.cadence.app.network.dto.AnchorDto
import com.cadence.app.network.dto.AnchorUpdateDto
import com.cadence.app.network.dto.CategoryCreateDto
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.network.dto.CategoryUpdateDto
import com.cadence.app.network.dto.DayEntrySetDto
import com.cadence.app.network.dto.EventCreateDto
import com.cadence.app.network.dto.EventDto
import com.cadence.app.network.dto.ReviewOutDto
import com.cadence.app.network.dto.ReviewUpsertDto
import com.cadence.app.network.dto.SessionCreateDto
import com.cadence.app.network.dto.UserDto
import com.cadence.app.network.dto.UserUpdateDto
import com.cadence.app.notifications.ReminderScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.IOException
import java.util.UUID
import retrofit2.HttpException

/** A permanently-rejected pending op (4xx from the server) -- dropped from
 * its queue during flush rather than retried forever. [id] is the tempId
 * for a rejected create, the real id for a rejected update/delete (or a
 * fixed key like "profile" / a weekStart for the singleton queues) -- the
 * same id the public repository method that originally enqueued it
 * checks for, to decide whether to surface a real error instead of
 * treating the op as merely "queued". `internal` (not private) since
 * [CadenceRepository.flushAllOutboxes] is also called from
 * OutboxSyncWorker in another file within this module. */
internal data class Rejection(val id: String, val status: Int?, val message: String)

/**
 * Orchestrates network + local cache (docs/architecture.md §4): every screen
 * reads from [CadenceLocalStore] first -- so the app renders whatever it
 * last saw even with no connection -- then [refreshAll] opportunistically
 * updates that cache in the background (full-refetch on foreground rather
 * than the delta `/changes` cursor the architecture doc describes but the
 * backend doesn't implement yet).
 *
 * Every mutation in the app -- not just session logging and day-type
 * marking -- applies to the local cache immediately and queues for later
 * sync, so the app is fully usable offline for every account tier. Offline-
 * created entities (categories, anchors, events) get a client-generated
 * "local-<uuid>" id, shown in the UI right away; once a create actually
 * syncs, every other still-pending op referencing that temp id is rewritten
 * in place to the real one (see [remapCategoryId]). All flushing goes
 * through the single mutex-guarded [flushAllOutboxes], in a fixed priority
 * order (categories -> anchors -> events -> sessions -> day types ->
 * profile -> reviews) so anything that might reference a category's real
 * id is never flushed before that category itself is.
 */
class CadenceRepository(
    private val api: ApiService,
    private val local: CadenceLocalStore,
    val appContext: Context,
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
    val hasAnyPendingWork = local.hasAnyPendingWork

    /** Guards every flush (the immediate attempt right after any mutation,
     * and the WorkManager-triggered retry) so they can never interleave
     * and race on the same DataStore-backed queues -- important once a
     * successful create's ID-remap has to rewrite several queues in one
     * logical step. */
    private val outboxMutex = Mutex()

    // Cross-cutting, app-lifetime concern (not tied to any one screen's
    // ViewModel scope) -- reschedules schedule-block reminders (see
    // notifications/ReminderScheduler.kt) whenever the anchors list or the
    // notifications_enabled flag changes, same dependency array as web's
    // own anchor-notification useEffect.
    private val repositoryScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    init {
        repositoryScope.launch {
            combine(anchors, profile) { a, p -> a to (p?.notificationsEnabled ?: false) }
                .collect { (currentAnchors, enabled) -> ReminderScheduler.reschedule(appContext, currentAnchors, enabled) }
        }
    }

    /** Runs [action] for each item in [items], in order. A permanent (4xx)
     * rejection drops that item (recording why) and continues with the
     * rest; a transient failure (offline / 5xx) stops immediately, leaving
     * that item and everything after it queued for the next attempt.
     * Shared by every per-entity flush step below -- without it this file
     * would repeat the same try/catch classification 8+ times. */
    private suspend fun <T> flushQueue(items: List<T>, idOf: (T) -> String, action: suspend (T) -> Unit): Pair<List<T>, List<Rejection>> {
        val rejections = mutableListOf<Rejection>()
        var index = 0
        while (index < items.size) {
            val item = items[index]
            try {
                action(item)
            } catch (e: HttpException) {
                if (e.code() in 400..499) {
                    rejections += Rejection(idOf(item), e.code(), e.message() ?: "Rejected")
                } else {
                    break
                }
            } catch (e: IOException) {
                break
            }
            index++
        }
        return items.subList(index, items.size).toList() to rejections
    }

    /** Applies [apply] to the local cache + outbox immediately (so the UI
     * reflects the change regardless of connectivity), then flushes
     * everything and checks whether *this specific* op (identified by
     * [tempOrRealId]) came back rejected. A plain network failure -- the
     * common "offline" case -- still returns Success, since the edit is
     * safely queued for later; only a genuine permanent rejection (4xx)
     * returns Failure, running [rollback] first if given (used for
     * creates, to remove the now-invalid temp-id preview -- updates
     * deliberately don't roll back, see updateCategory's doc). */
    private suspend fun optimisticWrite(tempOrRealId: String, apply: suspend () -> Unit, rollback: suspend () -> Unit = {}): ApiResult<Unit> = try {
        apply()
        val rejections = flushAllOutboxes()
        val rejection = rejections.firstOrNull { it.id == tempOrRealId }
        if (rejection != null) {
            rollback()
            ApiResult.Failure(rejection.status, rejection.message)
        } else {
            // Not rejected, but may still be queued (offline/5xx) -- make
            // sure it gets picked up later even if the app closes before
            // connectivity returns, same as logSession/setDayType already do.
            if (local.hasAnyPendingWork.first()) scheduleRetry()
            ApiResult.Success(Unit)
        }
    } catch (e: IOException) {
        ApiResult.Failure(null, e.message ?: "Local storage error")
    }

    suspend fun refreshAll(): ApiResult<Unit> = try {
        flushAllOutboxes()
        coroutineScope {
            launch { local.saveProfile(api.getMe()) }
            launch {
                val server = api.getCategories()
                val stillLocalOnly = local.pendingCategoryCreates.first().map { it.toPreview() }
                local.saveCategories(server + stillLocalOnly)
            }
            launch { local.saveTodaySchedule(api.getToday()) }
            launch { local.saveLeaveBalance(api.getLeaveBalance()) }
            launch { local.saveSessions(api.getSessions()) }
            launch {
                val server = api.getAnchors()
                val stillLocalOnly = local.pendingAnchorCreates.first().map { it.toPreview() }
                local.saveAnchors(server + stillLocalOnly)
            }
            launch {
                val server = api.getEvents()
                val stillLocalOnly = local.pendingEventCreates.first().map { it.toPreview() }
                local.saveEvents(server + stillLocalOnly)
            }
            launch { local.saveDayTypes(api.getDayTypes().associate { it.date to it.dayType }) }
            launch { local.saveStreaks(api.getStreaks()) }
            launch { local.saveInsights(api.getInsights()) }
        }
        ApiResult.Success(Unit)
    } catch (e: HttpException) {
        ApiResult.Failure(e.code(), e.message())
    } catch (e: IOException) {
        ApiResult.Failure(null, e.message ?: "Network error")
    }

    /** Plus-only (backend's `require_plus`) -- called separately from
     * [refreshAll] rather than unconditionally, since a free-plan account
     * would just 403 on every refresh. */
    suspend fun refreshLongTermTrend(): ApiResult<Unit> = try {
        local.saveLongTermTrend(api.getLongTermTrend())
        ApiResult.Success(Unit)
    } catch (e: HttpException) {
        ApiResult.Failure(e.code(), e.message())
    } catch (e: IOException) {
        ApiResult.Failure(null, e.message ?: "Network error")
    }

    // --- The single flush entry point -----------------------------------------

    /** Fixed priority: categories, then anchors, then events, then sessions,
     * then day types, then profile, then reviews -- so a category created
     * offline always has its real id (see [remapCategoryId]) before
     * anything that might reference it (currently just PendingSession)
     * gets flushed next. Guarded by [outboxMutex] so the immediate-attempt
     * flush after a mutation and the WorkManager-triggered retry can never
     * run concurrently. */
    internal suspend fun flushAllOutboxes(): List<Rejection> = outboxMutex.withLock {
        val rejections = mutableListOf<Rejection>()
        rejections += flushCategoryCreates()
        rejections += flushCategoryUpdates()
        rejections += flushCategoryDeletes()
        rejections += flushAnchorCreates()
        rejections += flushAnchorUpdates()
        rejections += flushAnchorDeletes()
        rejections += flushEventCreates()
        rejections += flushEventDeletes()
        rejections += flushSessionOutboxLocked()
        rejections += flushDayEntryOutboxLocked()
        rejections += flushProfileUpdate()
        rejections += flushReviewSaves()
        rejections
    }

    private fun scheduleRetry() {
        OutboxSyncWorker.enqueue(appContext)
    }

    // --- Session logging (offline-critical) --------------------------------

    /** Queues a session locally first (so Start/Stop always feels instant,
     * offline or not), then tries to flush everything immediately. If the
     * session is still queued afterward (offline), WorkManager picks it up
     * later (see data/SessionSyncWorker.kt). */
    suspend fun logSession(categoryId: String, date: String, durationMinutes: Int, tags: List<String> = emptyList()) {
        local.enqueuePendingSession(
            PendingSession(categoryId = categoryId, date = date, durationMinutes = durationMinutes, tags = tags)
        )
        flushAllOutboxes()
        if (local.pendingSessions.first().isNotEmpty()) scheduleRetry()
    }

    private suspend fun flushSessionOutboxLocked(): List<Rejection> {
        val pending = local.pendingSessions.first()
        val (_, rejections) = flushQueue(pending, idOf = { it.clientId }) { item ->
            val created = api.createSession(
                SessionCreateDto(categoryId = item.categoryId, date = item.date, durationMinutes = item.durationMinutes, tags = item.tags)
            )
            local.removePendingSession(item.clientId)
            local.saveSessions(local.cachedSessions.first() + created)
        }
        // No dedicated UI surface shows "this session failed to log" today
        // (logSession doesn't return an ApiResult) -- a rejected session
        // (e.g. its category got deleted) is just dropped rather than
        // retried forever.
        for (rejection in rejections) local.removePendingSession(rejection.id)
        return rejections
    }

    // --- Day type / leave marking (offline-critical) ------------------------

    /** Same shape as [logSession]: update the local day-type map immediately
     * (so the UI reflects the mark right away), queue it, then try to flush.
     * A day only ever has one type, so a second mark before the first
     * flushes just replaces the queued one (see PendingDayEntry). */
    suspend fun setDayType(date: String, dayType: String) {
        local.saveDayTypes(local.cachedDayTypes.first() + (date to dayType))
        local.enqueuePendingDayEntry(PendingDayEntry(date = date, dayType = dayType))
        flushAllOutboxes()
        if (local.pendingDayEntries.first().any { it.date == date }) scheduleRetry()
    }

    private suspend fun flushDayEntryOutboxLocked(): List<Rejection> {
        val pending = local.pendingDayEntries.first()
        if (pending.isEmpty()) return emptyList()
        val (survivors, rejections) = flushQueue(pending, idOf = { it.date }) { item ->
            val saved = api.setDayType(item.date, DayEntrySetDto(dayType = item.dayType))
            local.removePendingDayEntry(item.date)
            local.saveDayTypes(local.cachedDayTypes.first() + (saved.date to saved.dayType))
        }
        for (rejection in rejections) local.removePendingDayEntry(rejection.id)
        // A day-type change affects server-computed leave/streaks/schedule
        // (mirrors apps/web/src/lib/store.tsx's setDayType -> refreshComputed
        // chain) -- only worth re-pulling if something actually flushed.
        if (survivors.size < pending.size) {
            local.saveLeaveBalance(api.getLeaveBalance())
            local.saveStreaks(api.getStreaks())
            local.saveTodaySchedule(api.getToday())
        }
        return rejections
    }

    // --- Profile (name/avatar/accent color/timezone/leave/wake window/etc) ---

    /** Just `GET /me` -- used to resolve onboarded/routing state right after
     * sign-in, before any screen that would trigger the full [refreshAll]
     * has been shown (e.g. Setup, which replaces the whole app while
     * onboarded is false). */
    suspend fun refreshProfile(): ApiResult<Unit> = try {
        local.saveProfile(api.getMe())
        ApiResult.Success(Unit)
    } catch (e: HttpException) {
        ApiResult.Failure(e.code(), e.message())
    } catch (e: IOException) {
        ApiResult.Failure(null, e.message ?: "Network error")
    }

    /** Applies [patch] to the cached profile immediately, queues it
     * (coalesced with any not-yet-synced earlier patch -- see
     * PendingProfileUpdate), then tries to flush. Doesn't roll back on
     * rejection -- same policy as category/anchor updates, see
     * [updateCategory]. */
    suspend fun updateProfile(patch: UserUpdateDto): ApiResult<Unit> = optimisticWrite(
        tempOrRealId = "profile",
        apply = {
            val current = local.cachedProfile.first()
            if (current != null) local.saveProfile(current.applyPatch(patch))
            val existingPending = local.pendingProfileUpdate.first()
            val merged = existingPending?.body?.mergedWith(patch) ?: patch
            local.setPendingProfileUpdate(PendingProfileUpdate(merged))
        },
    )

    private suspend fun flushProfileUpdate(): List<Rejection> {
        val pending = local.pendingProfileUpdate.first() ?: return emptyList()
        return try {
            val saved = api.updateMe(pending.body)
            local.saveProfile(saved)
            local.setPendingProfileUpdate(null)
            emptyList()
        } catch (e: HttpException) {
            if (e.code() in 400..499) {
                local.setPendingProfileUpdate(null)
                listOf(Rejection("profile", e.code(), e.message() ?: "Rejected"))
            } else {
                emptyList()
            }
        } catch (e: IOException) {
            emptyList()
        }
    }

    // --- Items (categories) ----------------------------------------------------

    suspend fun createCategory(
        name: String,
        trackingMode: String,
        weeklyTarget: Double?,
        priorityTier: Int,
        weekendPreferred: Boolean,
    ): ApiResult<Unit> {
        val tempId = "local-${UUID.randomUUID()}"
        val body = CategoryCreateDto(name, trackingMode, weeklyTarget, priorityTier, weekendPreferred)
        return optimisticWrite(
            tempOrRealId = tempId,
            apply = {
                local.saveCategories(local.cachedCategories.first() + body.toPreview(tempId))
                local.setPendingCategoryCreates(local.pendingCategoryCreates.first() + PendingCategoryCreate(tempId = tempId, body = body))
            },
            rollback = { local.saveCategories(local.cachedCategories.first().filterNot { it.id == tempId }) },
        )
    }

    /** If [id] is still an un-synced local create (the create hasn't
     * happened server-side yet), the patch is merged into that create's
     * body instead of queuing a separate update. On rejection (e.g. the
     * backend's 400 for changing tracking_mode on a category with
     * existing sessions), the optimistic value is deliberately *not*
     * rolled back -- the user sees what they tried to set and can correct
     * it, rather than it silently reverting to a possibly-stale cached
     * value with no visible trace of what happened. */
    suspend fun updateCategory(id: String, patch: CategoryUpdateDto): ApiResult<Unit> = optimisticWrite(
        tempOrRealId = id,
        apply = {
            local.saveCategories(local.cachedCategories.first().map { if (it.id == id) it.applyPatch(patch) else it })
            val pendingCreates = local.pendingCategoryCreates.first()
            if (pendingCreates.any { it.tempId == id }) {
                local.setPendingCategoryCreates(pendingCreates.map { if (it.tempId == id) it.copy(body = it.body.applyPatch(patch)) else it })
            } else {
                val existing = local.pendingCategoryUpdates.first()
                local.setPendingCategoryUpdates(existing.filterNot { it.id == id } + PendingCategoryUpdate(id = id, body = patch))
            }
        },
    )

    suspend fun deleteCategory(id: String): ApiResult<Unit> = optimisticWrite(
        tempOrRealId = id,
        apply = {
            local.saveCategories(local.cachedCategories.first().filterNot { it.id == id })
            val pendingCreates = local.pendingCategoryCreates.first()
            if (pendingCreates.any { it.tempId == id }) {
                // Never existed server-side -- drop the create, nothing to send.
                local.setPendingCategoryCreates(pendingCreates.filterNot { it.tempId == id })
                local.setPendingCategoryUpdates(local.pendingCategoryUpdates.first().filterNot { it.id == id })
            } else {
                local.setPendingCategoryUpdates(local.pendingCategoryUpdates.first().filterNot { it.id == id })
                val existing = local.pendingCategoryDeletes.first()
                if (existing.none { it.id == id }) local.setPendingCategoryDeletes(existing + PendingCategoryDelete(id = id))
            }
        },
    )

    private suspend fun flushCategoryCreates(): List<Rejection> {
        val pending = local.pendingCategoryCreates.first()
        val (survivors, rejections) = flushQueue(pending, idOf = { it.tempId }) { item ->
            val created = api.createCategory(item.body)
            local.saveCategories(local.cachedCategories.first().map { if (it.id == item.tempId) created else it })
            remapCategoryId(item.tempId, created.id)
        }
        for (rejection in rejections) {
            local.saveCategories(local.cachedCategories.first().filterNot { it.id == rejection.id })
        }
        local.setPendingCategoryCreates(survivors)
        return rejections
    }

    private suspend fun flushCategoryUpdates(): List<Rejection> {
        val pending = local.pendingCategoryUpdates.first()
        val (survivors, rejections) = flushQueue(pending, idOf = { it.id }) { item ->
            val updated = api.updateCategory(item.id, item.body)
            local.saveCategories(local.cachedCategories.first().map { if (it.id == item.id) updated else it })
        }
        local.setPendingCategoryUpdates(survivors)
        return rejections
    }

    private suspend fun flushCategoryDeletes(): List<Rejection> {
        val pending = local.pendingCategoryDeletes.first()
        val (survivors, rejections) = flushQueue(pending, idOf = { it.id }) { item -> api.deleteCategory(item.id) }
        local.setPendingCategoryDeletes(survivors)
        return rejections
    }

    /** After a category create syncs and gets a real id, every other
     * still-pending op referencing the old temp id is rewritten in place --
     * durable (persisted before continuing) and idempotent (a no-op if the
     * id was already remapped, since it just checks for the temp id's
     * presence before rewriting), so a process death mid-remap plus a
     * later retry can't double-apply or lose track. Runs inside
     * [flushAllOutboxes]'s single mutex-held pass, so nothing else can
     * observe or mutate these queues mid-remap. */
    private suspend fun remapCategoryId(tempId: String, realId: String) {
        val pendingSessions = local.pendingSessions.first()
        for (item in pendingSessions.filter { it.categoryId == tempId }) {
            local.removePendingSession(item.clientId)
            local.enqueuePendingSession(item.copy(categoryId = realId))
        }
        val anchorCreates = local.pendingAnchorCreates.first()
        if (anchorCreates.any { tempId in it.body.categoryIds }) {
            local.setPendingAnchorCreates(
                anchorCreates.map {
                    if (tempId in it.body.categoryIds) {
                        it.copy(body = it.body.copy(categoryIds = it.body.categoryIds.map { id -> if (id == tempId) realId else id }))
                    } else it
                }
            )
        }
        val anchorUpdates = local.pendingAnchorUpdates.first()
        if (anchorUpdates.any { tempId in (it.body.categoryIds ?: emptyList()) }) {
            local.setPendingAnchorUpdates(
                anchorUpdates.map {
                    val ids = it.body.categoryIds
                    if (ids != null && tempId in ids) it.copy(body = it.body.copy(categoryIds = ids.map { id -> if (id == tempId) realId else id })) else it
                }
            )
        }
    }

    // --- Anchors -------------------------------------------------------------

    suspend fun createAnchor(body: AnchorCreateDto): ApiResult<Unit> {
        val tempId = "local-${UUID.randomUUID()}"
        return optimisticWrite(
            tempOrRealId = tempId,
            apply = {
                local.saveAnchors(local.cachedAnchors.first() + body.toPreview(tempId))
                local.setPendingAnchorCreates(local.pendingAnchorCreates.first() + PendingAnchorCreate(tempId = tempId, body = body))
            },
            rollback = { local.saveAnchors(local.cachedAnchors.first().filterNot { it.id == tempId }) },
        )
    }

    suspend fun updateAnchor(id: String, body: AnchorUpdateDto): ApiResult<Unit> = optimisticWrite(
        tempOrRealId = id,
        apply = {
            local.saveAnchors(local.cachedAnchors.first().map { if (it.id == id) it.applyPatch(body) else it })
            val pendingCreates = local.pendingAnchorCreates.first()
            if (pendingCreates.any { it.tempId == id }) {
                local.setPendingAnchorCreates(pendingCreates.map { if (it.tempId == id) it.copy(body = it.body.applyPatch(body)) else it })
            } else {
                val existing = local.pendingAnchorUpdates.first()
                local.setPendingAnchorUpdates(existing.filterNot { it.id == id } + PendingAnchorUpdate(id = id, body = body))
            }
        },
    )

    suspend fun deleteAnchor(id: String): ApiResult<Unit> = optimisticWrite(
        tempOrRealId = id,
        apply = {
            local.saveAnchors(local.cachedAnchors.first().filterNot { it.id == id })
            val pendingCreates = local.pendingAnchorCreates.first()
            if (pendingCreates.any { it.tempId == id }) {
                local.setPendingAnchorCreates(pendingCreates.filterNot { it.tempId == id })
                local.setPendingAnchorUpdates(local.pendingAnchorUpdates.first().filterNot { it.id == id })
            } else {
                local.setPendingAnchorUpdates(local.pendingAnchorUpdates.first().filterNot { it.id == id })
                val existing = local.pendingAnchorDeletes.first()
                if (existing.none { it.id == id }) local.setPendingAnchorDeletes(existing + PendingAnchorDelete(id = id))
            }
        },
    )

    private suspend fun flushAnchorCreates(): List<Rejection> {
        val pending = local.pendingAnchorCreates.first()
        val (survivors, rejections) = flushQueue(pending, idOf = { it.tempId }) { item ->
            val created = api.createAnchor(item.body)
            local.saveAnchors(local.cachedAnchors.first().map { if (it.id == item.tempId) created else it })
        }
        for (rejection in rejections) {
            local.saveAnchors(local.cachedAnchors.first().filterNot { it.id == rejection.id })
        }
        local.setPendingAnchorCreates(survivors)
        return rejections
    }

    private suspend fun flushAnchorUpdates(): List<Rejection> {
        val pending = local.pendingAnchorUpdates.first()
        val (survivors, rejections) = flushQueue(pending, idOf = { it.id }) { item ->
            val updated = api.updateAnchor(item.id, item.body)
            local.saveAnchors(local.cachedAnchors.first().map { if (it.id == item.id) updated else it })
        }
        local.setPendingAnchorUpdates(survivors)
        return rejections
    }

    private suspend fun flushAnchorDeletes(): List<Rejection> {
        val pending = local.pendingAnchorDeletes.first()
        val (survivors, rejections) = flushQueue(pending, idOf = { it.id }) { item -> api.deleteAnchor(item.id) }
        local.setPendingAnchorDeletes(survivors)
        return rejections
    }

    // --- Events ----------------------------------------------------------------

    suspend fun createEvent(body: EventCreateDto): ApiResult<Unit> {
        val tempId = "local-${UUID.randomUUID()}"
        return optimisticWrite(
            tempOrRealId = tempId,
            apply = {
                local.saveEvents(local.cachedEvents.first() + body.toPreview(tempId))
                local.setPendingEventCreates(local.pendingEventCreates.first() + PendingEventCreate(tempId = tempId, body = body))
            },
            rollback = { local.saveEvents(local.cachedEvents.first().filterNot { it.id == tempId }) },
        )
    }

    suspend fun deleteEvent(id: String): ApiResult<Unit> = optimisticWrite(
        tempOrRealId = id,
        apply = {
            local.saveEvents(local.cachedEvents.first().filterNot { it.id == id })
            val pendingCreates = local.pendingEventCreates.first()
            if (pendingCreates.any { it.tempId == id }) {
                local.setPendingEventCreates(pendingCreates.filterNot { it.tempId == id })
            } else {
                val existing = local.pendingEventDeletes.first()
                if (existing.none { it.id == id }) local.setPendingEventDeletes(existing + PendingEventDelete(id = id))
            }
        },
    )

    private suspend fun flushEventCreates(): List<Rejection> {
        val pending = local.pendingEventCreates.first()
        val (survivors, rejections) = flushQueue(pending, idOf = { it.tempId }) { item ->
            val created = api.createEvent(item.body)
            local.saveEvents(local.cachedEvents.first().map { if (it.id == item.tempId) created else it })
        }
        for (rejection in rejections) {
            local.saveEvents(local.cachedEvents.first().filterNot { it.id == rejection.id })
        }
        local.setPendingEventCreates(survivors)
        return rejections
    }

    private suspend fun flushEventDeletes(): List<Rejection> {
        val pending = local.pendingEventDeletes.first()
        val (survivors, rejections) = flushQueue(pending, idOf = { it.id }) { item -> api.deleteEvent(item.id) }
        local.setPendingEventDeletes(survivors)
        return rejections
    }

    // --- Weekly review ---------------------------------------------------------

    suspend fun loadReview(weekStart: String): ApiResult<Unit> = try {
        local.saveReview(weekStart, api.getWeeklyReview(weekStart))
        ApiResult.Success(Unit)
    } catch (e: HttpException) {
        ApiResult.Failure(e.code(), e.message())
    } catch (e: IOException) {
        ApiResult.Failure(null, e.message ?: "Network error")
    }

    suspend fun saveReview(weekStart: String, wins: String, problems: String, nextWeekChanges: String): ApiResult<Unit> = optimisticWrite(
        tempOrRealId = weekStart,
        apply = {
            local.saveReview(weekStart, ReviewOutDto(weekStart = weekStart, wins = wins, problems = problems, nextWeekChanges = nextWeekChanges))
            val existing = local.pendingReviewSaves.first()
            local.setPendingReviewSaves(existing.filterNot { it.weekStart == weekStart } + PendingReviewSave(weekStart, ReviewUpsertDto(wins, problems, nextWeekChanges)))
        },
    )

    private suspend fun flushReviewSaves(): List<Rejection> {
        val pending = local.pendingReviewSaves.first()
        val (survivors, rejections) = flushQueue(pending, idOf = { it.weekStart }) { item ->
            val saved = api.setWeeklyReview(item.weekStart, item.body)
            local.saveReview(item.weekStart, saved)
        }
        local.setPendingReviewSaves(survivors)
        return rejections
    }

    // --- Calendar (week view) ---------------------------------------------------

    /** One `GET /today?on_date=` per day rather than reimplementing the
     * planner's ranking logic client-side -- scheduling stays server-side
     * per docs/architecture.md §2. [weekStartDates] are ISO date strings. */
    suspend fun refreshWeek(weekStartDates: List<String>): ApiResult<Unit> = try {
        coroutineScope {
            weekStartDates.forEach { date ->
                launch { local.saveWeekScheduleDay(date, api.getToday(date)) }
            }
        }
        ApiResult.Success(Unit)
    } catch (e: HttpException) {
        ApiResult.Failure(e.code(), e.message())
    } catch (e: IOException) {
        ApiResult.Failure(null, e.message ?: "Network error")
    }

    suspend fun signOutCleanup() = local.clearAll()

    // --- Cross-screen "open Timer for this item" handoff -----------------

    private val _pendingTimerCategoryId = MutableStateFlow<String?>(null)

    /** In-memory only (not persisted) -- Today's "This week" rows use this
     * to jump to the Timer tab with a category pre-selected, since the
     * NavHost route itself carries no arguments. [consumePendingTimerCategory]
     * clears it on read so it only ever applies once. */
    fun requestTimerFor(categoryId: String) {
        _pendingTimerCategoryId.value = categoryId
    }

    fun consumePendingTimerCategory(): String? {
        val value = _pendingTimerCategoryId.value
        _pendingTimerCategoryId.value = null
        return value
    }
}

// --- Optimistic patch/preview helpers -------------------------------------------

private fun CategoryCreateDto.toPreview(tempId: String) = CategoryDto(
    id = tempId, name = name, trackingMode = trackingMode, weeklyTarget = weeklyTarget,
    priorityTier = priorityTier, weekendPreferred = weekendPreferred,
    color = "bg-marigold", // server-assigned on real sync; placeholder until then
)

private fun PendingCategoryCreate.toPreview() = body.toPreview(tempId)

private fun CategoryDto.applyPatch(patch: CategoryUpdateDto) = copy(
    name = patch.name ?: name,
    trackingMode = patch.trackingMode ?: trackingMode,
    weeklyTarget = patch.weeklyTarget ?: weeklyTarget,
    priorityTier = patch.priorityTier ?: priorityTier,
    weekendPreferred = patch.weekendPreferred ?: weekendPreferred,
)

private fun CategoryCreateDto.applyPatch(patch: CategoryUpdateDto) = copy(
    name = patch.name ?: name,
    trackingMode = patch.trackingMode ?: trackingMode,
    weeklyTarget = patch.weeklyTarget ?: weeklyTarget,
    priorityTier = patch.priorityTier ?: priorityTier,
    weekendPreferred = patch.weekendPreferred ?: weekendPreferred,
)

private fun AnchorCreateDto.toPreview(tempId: String) = AnchorDto(
    id = tempId, label = label, start = start, end = end, recurrence = recurrence,
    daysOfWeek = daysOfWeek, date = date, isFocusBlock = isFocusBlock, categoryIds = categoryIds,
)

private fun PendingAnchorCreate.toPreview() = body.toPreview(tempId)

private fun AnchorDto.applyPatch(patch: AnchorUpdateDto) = copy(
    label = patch.label ?: label,
    start = patch.start ?: start,
    end = patch.end ?: end,
    recurrence = patch.recurrence ?: recurrence,
    daysOfWeek = patch.daysOfWeek ?: daysOfWeek,
    date = patch.date ?: date,
    isFocusBlock = patch.isFocusBlock ?: isFocusBlock,
    categoryIds = patch.categoryIds ?: categoryIds,
)

private fun AnchorCreateDto.applyPatch(patch: AnchorUpdateDto) = copy(
    label = patch.label ?: label,
    start = patch.start ?: start,
    end = patch.end ?: end,
    recurrence = patch.recurrence ?: recurrence,
    daysOfWeek = patch.daysOfWeek ?: daysOfWeek,
    date = patch.date ?: date,
    isFocusBlock = patch.isFocusBlock ?: isFocusBlock,
    categoryIds = patch.categoryIds ?: categoryIds,
)

private fun EventCreateDto.toPreview(tempId: String) = EventDto(
    id = tempId, title = title, date = date, start = start, end = end, type = type, notes = notes,
)

private fun PendingEventCreate.toPreview() = body.toPreview(tempId)

private fun UserDto.applyPatch(patch: UserUpdateDto) = copy(
    name = patch.name ?: name,
    avatar = patch.avatar ?: avatar,
    accentColor = patch.accentColor ?: accentColor,
    timezone = patch.timezone ?: timezone,
    wakeStart = patch.wakeStart ?: wakeStart,
    wakeEnd = patch.wakeEnd ?: wakeEnd,
    leaveMonthlyAllowance = patch.leaveMonthlyAllowance ?: leaveMonthlyAllowance,
    leaveCarryCap = patch.leaveCarryCap ?: leaveCarryCap,
    notificationsEnabled = patch.notificationsEnabled ?: notificationsEnabled,
    onboarded = patch.onboarded ?: onboarded,
)

private fun UserUpdateDto.mergedWith(newer: UserUpdateDto) = UserUpdateDto(
    name = newer.name ?: name,
    avatar = newer.avatar ?: avatar,
    accentColor = newer.accentColor ?: accentColor,
    timezone = newer.timezone ?: timezone,
    wakeStart = newer.wakeStart ?: wakeStart,
    wakeEnd = newer.wakeEnd ?: wakeEnd,
    leaveMonthlyAllowance = newer.leaveMonthlyAllowance ?: leaveMonthlyAllowance,
    leaveCarryCap = newer.leaveCarryCap ?: leaveCarryCap,
    notificationsEnabled = newer.notificationsEnabled ?: notificationsEnabled,
    onboarded = newer.onboarded ?: onboarded,
)
