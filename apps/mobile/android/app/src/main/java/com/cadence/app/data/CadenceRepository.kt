package com.cadence.app.data

import android.content.Context
import com.cadence.app.data.local.CadenceLocalStore
import com.cadence.app.data.local.PendingSession
import com.cadence.app.network.ApiResult
import com.cadence.app.network.ApiService
import com.cadence.app.network.apiCall
import com.cadence.app.network.dto.SessionCreateDto
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Orchestrates network + local cache (docs/architecture.md §4): reads
 * always come from [CadenceLocalStore], refreshed wholesale on
 * [refreshAll] (full-refetch on foreground -- see the plan's note on why
 * this stands in for the delta `/changes` cursor the architecture doc
 * describes but the backend doesn't implement yet). Writes for session
 * logging go through the outbox so Start/Stop keeps working offline.
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
    val pendingSessions = local.pendingSessions

    suspend fun refreshAll(): ApiResult<Unit> = apiCall {
        coroutineScope {
            launch { local.saveProfile(api.getMe()) }
            launch { local.saveCategories(api.getCategories()) }
            launch { local.saveTodaySchedule(api.getToday()) }
            launch { local.saveLeaveBalance(api.getLeaveBalance()) }
            launch { local.saveSessions(api.getSessions()) }
        }
    }

    /** Queues a session locally first (so Start/Stop always feels instant,
     * offline or not), then tries to flush immediately. If that fails the
     * entry just stays in the outbox for [flushOutbox] to pick up later
     * (see data/SessionSyncWorker.kt). */
    suspend fun logSession(categoryId: String, date: String, durationMinutes: Int, tags: List<String> = emptyList()) {
        local.enqueuePendingSession(
            PendingSession(categoryId = categoryId, date = date, durationMinutes = durationMinutes, tags = tags)
        )
        val result = flushOutbox()
        // Immediate flush failed (offline, or a transient error) -- the
        // entry stays queued; let WorkManager retry once connectivity is
        // back rather than losing it (docs/architecture.md §4's outbox).
        if (result is ApiResult.Failure) {
            SessionSyncWorker.enqueue(appContext)
        }
    }

    suspend fun flushOutbox(): ApiResult<Unit> = apiCall {
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

    suspend fun signOutCleanup() = local.clearAll()
}
