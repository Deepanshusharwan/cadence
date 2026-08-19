package com.cadence.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.network.dto.LeaveBalanceDto
import com.cadence.app.network.dto.ScheduleBlockDto
import com.cadence.app.network.dto.SessionDto
import com.cadence.app.network.dto.UserDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID

val Context.cadenceDataStore: DataStore<Preferences> by preferencesDataStore(name = "cadence_store")

/** A locally-queued write not yet confirmed by the backend -- the "outbox"
 * half of docs/architecture.md §4's cache+outbox model. [clientId] is the
 * idempotency key: a retried flush after a flaky network response that
 * actually succeeded server-side would otherwise double-log the session. */
@Serializable
data class PendingSession(
    val clientId: String = UUID.randomUUID().toString(),
    val categoryId: String,
    val date: String,
    val durationMinutes: Int,
    val tags: List<String> = emptyList(),
)

/**
 * The mobile read cache + write outbox (docs/architecture.md §4). Backed by
 * a single Preferences DataStore holding one JSON blob per entity list --
 * deliberately not Room: nothing here needs relational queries or joins
 * (all real computation is server-side per the architecture doc), so a
 * key-value snapshot store is a simpler fit for "cache of the last full
 * GET response" + "a small pending-writes queue" than a SQL schema would be.
 */
class CadenceLocalStore(private val context: Context) {
    private val json = Json { ignoreUnknownKeys = true }

    private object Keys {
        val PROFILE = stringPreferencesKey("cached_profile")
        val CATEGORIES = stringPreferencesKey("cached_categories")
        val TODAY_SCHEDULE = stringPreferencesKey("cached_today_schedule")
        val LEAVE_BALANCE = stringPreferencesKey("cached_leave_balance")
        val SESSIONS = stringPreferencesKey("cached_sessions")
        val PENDING_SESSIONS = stringPreferencesKey("pending_sessions")
    }

    val cachedProfile: Flow<UserDto?> = context.cadenceDataStore.data.map { it.decode(Keys.PROFILE) }
    val cachedCategories: Flow<List<CategoryDto>> =
        context.cadenceDataStore.data.map { it.decodeList(Keys.CATEGORIES) }
    val cachedTodaySchedule: Flow<List<ScheduleBlockDto>> =
        context.cadenceDataStore.data.map { it.decodeList(Keys.TODAY_SCHEDULE) }
    val cachedLeaveBalance: Flow<LeaveBalanceDto?> =
        context.cadenceDataStore.data.map { it.decode(Keys.LEAVE_BALANCE) }
    val cachedSessions: Flow<List<SessionDto>> =
        context.cadenceDataStore.data.map { it.decodeList(Keys.SESSIONS) }
    val pendingSessions: Flow<List<PendingSession>> =
        context.cadenceDataStore.data.map { it.decodeList(Keys.PENDING_SESSIONS) }

    suspend fun saveProfile(profile: UserDto) = context.cadenceDataStore.edit { it[Keys.PROFILE] = json.encodeToString(profile) }
    suspend fun saveCategories(categories: List<CategoryDto>) =
        context.cadenceDataStore.edit { it[Keys.CATEGORIES] = json.encodeToString(categories) }
    suspend fun saveTodaySchedule(blocks: List<ScheduleBlockDto>) =
        context.cadenceDataStore.edit { it[Keys.TODAY_SCHEDULE] = json.encodeToString(blocks) }
    suspend fun saveLeaveBalance(balance: LeaveBalanceDto) =
        context.cadenceDataStore.edit { it[Keys.LEAVE_BALANCE] = json.encodeToString(balance) }
    suspend fun saveSessions(sessions: List<SessionDto>) =
        context.cadenceDataStore.edit { it[Keys.SESSIONS] = json.encodeToString(sessions) }

    suspend fun enqueuePendingSession(pending: PendingSession) {
        context.cadenceDataStore.edit { prefs ->
            val current = prefs.decodeList<PendingSession>(Keys.PENDING_SESSIONS)
            prefs[Keys.PENDING_SESSIONS] = json.encodeToString(current + pending)
        }
    }

    suspend fun removePendingSession(clientId: String) {
        context.cadenceDataStore.edit { prefs ->
            val current = prefs.decodeList<PendingSession>(Keys.PENDING_SESSIONS)
            prefs[Keys.PENDING_SESSIONS] = json.encodeToString(current.filterNot { it.clientId == clientId })
        }
    }

    /** Clears everything -- called on sign-out so a different account
     * signing in next never sees a stale previous user's cache. */
    suspend fun clearAll() {
        context.cadenceDataStore.edit { it.clear() }
    }

    private inline fun <reified T> Preferences.decode(key: Preferences.Key<String>): T? =
        this[key]?.let { json.decodeFromString<T>(it) }

    private inline fun <reified T> Preferences.decodeList(key: Preferences.Key<String>): List<T> =
        this[key]?.let { json.decodeFromString<List<T>>(it) } ?: emptyList()
}
