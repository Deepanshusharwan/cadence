package com.cadence.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.cadence.app.network.dto.AnchorCreateDto
import com.cadence.app.network.dto.AnchorDto
import com.cadence.app.network.dto.AnchorUpdateDto
import com.cadence.app.network.dto.CategoryCreateDto
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.network.dto.CategoryUpdateDto
import com.cadence.app.network.dto.EventCreateDto
import com.cadence.app.network.dto.EventDto
import com.cadence.app.network.dto.InsightDto
import com.cadence.app.network.dto.LeaveBalanceDto
import com.cadence.app.network.dto.LongTermTrendDto
import com.cadence.app.network.dto.ReviewOutDto
import com.cadence.app.network.dto.ReviewUpsertDto
import com.cadence.app.network.dto.ScheduleBlockDto
import com.cadence.app.network.dto.SessionDto
import com.cadence.app.network.dto.StreakInfoDto
import com.cadence.app.network.dto.UserDto
import com.cadence.app.network.dto.UserUpdateDto
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

/** The other action architecture.md §4 calls out as needing to work
 * offline: "mark a day reduced/leave". Keyed by date (not a random
 * clientId) since a day only ever has one day_type -- a second mark for
 * the same date before the first flushes should replace it, not queue a
 * duplicate PUT. */
@Serializable
data class PendingDayEntry(
    val date: String,
    val dayType: String,
)

/** The rest of the write surface (docs/architecture.md §4's expanded
 * scope): every mutation applies to the local cache immediately (with a
 * client-generated [tempId] for creates, so an offline-created entity
 * shows up in the UI right away instead of only after it syncs) and
 * queues here. Flushed in a fixed priority order by
 * CadenceRepository.flushAllOutboxes() -- categories before anything that
 * might reference a category's real id (see CadenceRepository's remap
 * logic). */
@Serializable
data class PendingCategoryCreate(val clientId: String = UUID.randomUUID().toString(), val tempId: String, val body: CategoryCreateDto)

@Serializable
data class PendingCategoryUpdate(val clientId: String = UUID.randomUUID().toString(), val id: String, val body: CategoryUpdateDto)

@Serializable
data class PendingCategoryDelete(val clientId: String = UUID.randomUUID().toString(), val id: String)

@Serializable
data class PendingAnchorCreate(val clientId: String = UUID.randomUUID().toString(), val tempId: String, val body: AnchorCreateDto)

@Serializable
data class PendingAnchorUpdate(val clientId: String = UUID.randomUUID().toString(), val id: String, val body: AnchorUpdateDto)

@Serializable
data class PendingAnchorDelete(val clientId: String = UUID.randomUUID().toString(), val id: String)

@Serializable
data class PendingEventCreate(val clientId: String = UUID.randomUUID().toString(), val tempId: String, val body: EventCreateDto)

@Serializable
data class PendingEventDelete(val clientId: String = UUID.randomUUID().toString(), val id: String)

/** A single coalesced slot, not a list -- a second profile edit before the
 * first syncs merges into one PATCH (same "replace existing entry" rule
 * [PendingDayEntry] uses, just keyed uniquely since there's only ever one
 * profile). Null body fields in a later edit don't overwrite earlier ones;
 * see CadenceRepository's merge logic. */
@Serializable
data class PendingProfileUpdate(val body: UserUpdateDto)

/** Coalesced per [weekStart] -- a second edit to the same week's review
 * before the first syncs replaces it, matching [PendingDayEntry]'s
 * per-date rule. */
@Serializable
data class PendingReviewSave(val weekStart: String, val body: ReviewUpsertDto)

/**
 * The mobile read cache + write outbox (docs/architecture.md §4): every
 * screen renders from here first (so the app is usable with stale data
 * offline, per spec), then a background refresh updates it opportunistically.
 * Backed by a single Preferences DataStore holding one JSON blob per entity
 * list -- deliberately not Room: nothing here needs relational queries or
 * joins (all real computation is server-side per the architecture doc), so a
 * key-value snapshot store is a simpler fit than a SQL schema would be.
 */
class CadenceLocalStore(private val context: Context) {
    private val json = Json { ignoreUnknownKeys = true }

    private object Keys {
        val PROFILE = stringPreferencesKey("cached_profile")
        val CATEGORIES = stringPreferencesKey("cached_categories")
        val TODAY_SCHEDULE = stringPreferencesKey("cached_today_schedule")
        val LEAVE_BALANCE = stringPreferencesKey("cached_leave_balance")
        val SESSIONS = stringPreferencesKey("cached_sessions")
        val ANCHORS = stringPreferencesKey("cached_anchors")
        val EVENTS = stringPreferencesKey("cached_events")
        val DAY_TYPES = stringPreferencesKey("cached_day_types")
        val STREAKS = stringPreferencesKey("cached_streaks")
        val INSIGHTS = stringPreferencesKey("cached_insights")
        val LONG_TERM_TREND = stringPreferencesKey("cached_long_term_trend")
        val REVIEWS = stringPreferencesKey("cached_reviews") // week_start -> ReviewOutDto
        val WEEK_SCHEDULE = stringPreferencesKey("cached_week_schedule") // date -> blocks
        val PENDING_SESSIONS = stringPreferencesKey("pending_sessions")
        val PENDING_DAY_ENTRIES = stringPreferencesKey("pending_day_entries")
        val PENDING_CATEGORY_CREATES = stringPreferencesKey("pending_category_creates")
        val PENDING_CATEGORY_UPDATES = stringPreferencesKey("pending_category_updates")
        val PENDING_CATEGORY_DELETES = stringPreferencesKey("pending_category_deletes")
        val PENDING_ANCHOR_CREATES = stringPreferencesKey("pending_anchor_creates")
        val PENDING_ANCHOR_UPDATES = stringPreferencesKey("pending_anchor_updates")
        val PENDING_ANCHOR_DELETES = stringPreferencesKey("pending_anchor_deletes")
        val PENDING_EVENT_CREATES = stringPreferencesKey("pending_event_creates")
        val PENDING_EVENT_DELETES = stringPreferencesKey("pending_event_deletes")
        val PENDING_PROFILE_UPDATE = stringPreferencesKey("pending_profile_update")
        val PENDING_REVIEW_SAVES = stringPreferencesKey("pending_review_saves")
    }

    val cachedProfile: Flow<UserDto?> = single(Keys.PROFILE)
    val cachedCategories: Flow<List<CategoryDto>> = list(Keys.CATEGORIES)
    val cachedTodaySchedule: Flow<List<ScheduleBlockDto>> = list(Keys.TODAY_SCHEDULE)
    val cachedLeaveBalance: Flow<LeaveBalanceDto?> = single(Keys.LEAVE_BALANCE)
    val cachedSessions: Flow<List<SessionDto>> = list(Keys.SESSIONS)
    val cachedAnchors: Flow<List<AnchorDto>> = list(Keys.ANCHORS)
    val cachedEvents: Flow<List<EventDto>> = list(Keys.EVENTS)
    val cachedDayTypes: Flow<Map<String, String>> = map(Keys.DAY_TYPES) // date -> day_type
    val cachedStreaks: Flow<StreakInfoDto?> = single(Keys.STREAKS)
    val cachedInsights: Flow<List<InsightDto>> = list(Keys.INSIGHTS)
    val cachedLongTermTrend: Flow<LongTermTrendDto?> = single(Keys.LONG_TERM_TREND)
    val cachedReviews: Flow<Map<String, ReviewOutDto>> = map(Keys.REVIEWS) // week_start -> review
    val cachedWeekSchedule: Flow<Map<String, List<ScheduleBlockDto>>> = map(Keys.WEEK_SCHEDULE) // date -> blocks
    val pendingSessions: Flow<List<PendingSession>> = list(Keys.PENDING_SESSIONS)
    val pendingDayEntries: Flow<List<PendingDayEntry>> = list(Keys.PENDING_DAY_ENTRIES)
    val pendingCategoryCreates: Flow<List<PendingCategoryCreate>> = list(Keys.PENDING_CATEGORY_CREATES)
    val pendingCategoryUpdates: Flow<List<PendingCategoryUpdate>> = list(Keys.PENDING_CATEGORY_UPDATES)
    val pendingCategoryDeletes: Flow<List<PendingCategoryDelete>> = list(Keys.PENDING_CATEGORY_DELETES)
    val pendingAnchorCreates: Flow<List<PendingAnchorCreate>> = list(Keys.PENDING_ANCHOR_CREATES)
    val pendingAnchorUpdates: Flow<List<PendingAnchorUpdate>> = list(Keys.PENDING_ANCHOR_UPDATES)
    val pendingAnchorDeletes: Flow<List<PendingAnchorDelete>> = list(Keys.PENDING_ANCHOR_DELETES)
    val pendingEventCreates: Flow<List<PendingEventCreate>> = list(Keys.PENDING_EVENT_CREATES)
    val pendingEventDeletes: Flow<List<PendingEventDelete>> = list(Keys.PENDING_EVENT_DELETES)
    val pendingProfileUpdate: Flow<PendingProfileUpdate?> = single(Keys.PENDING_PROFILE_UPDATE)
    val pendingReviewSaves: Flow<List<PendingReviewSave>> = list(Keys.PENDING_REVIEW_SAVES)

    /** True if any outbox (existing two + all new ones) has unflushed
     * work -- used by SettingsScreen's sign-out guard. */
    val hasAnyPendingWork: Flow<Boolean> = context.cadenceDataStore.data.map { prefs ->
        listOf(
            Keys.PENDING_SESSIONS, Keys.PENDING_DAY_ENTRIES, Keys.PENDING_CATEGORY_CREATES,
            Keys.PENDING_CATEGORY_UPDATES, Keys.PENDING_CATEGORY_DELETES, Keys.PENDING_ANCHOR_CREATES,
            Keys.PENDING_ANCHOR_UPDATES, Keys.PENDING_ANCHOR_DELETES, Keys.PENDING_EVENT_CREATES,
            Keys.PENDING_EVENT_DELETES, Keys.PENDING_REVIEW_SAVES,
        ).any { key -> prefs[key]?.let { it != "[]" } == true } || prefs[Keys.PENDING_PROFILE_UPDATE] != null
    }

    suspend fun saveProfile(v: UserDto) = saveSingle(Keys.PROFILE, v)
    suspend fun saveCategories(v: List<CategoryDto>) = saveList(Keys.CATEGORIES, v)
    suspend fun saveTodaySchedule(v: List<ScheduleBlockDto>) = saveList(Keys.TODAY_SCHEDULE, v)
    suspend fun saveLeaveBalance(v: LeaveBalanceDto) = saveSingle(Keys.LEAVE_BALANCE, v)
    suspend fun saveSessions(v: List<SessionDto>) = saveList(Keys.SESSIONS, v)
    suspend fun saveAnchors(v: List<AnchorDto>) = saveList(Keys.ANCHORS, v)
    suspend fun saveEvents(v: List<EventDto>) = saveList(Keys.EVENTS, v)
    suspend fun saveDayTypes(v: Map<String, String>) = saveMap(Keys.DAY_TYPES, v)
    suspend fun saveStreaks(v: StreakInfoDto) = saveSingle(Keys.STREAKS, v)
    suspend fun saveInsights(v: List<InsightDto>) = saveList(Keys.INSIGHTS, v)
    suspend fun saveLongTermTrend(v: LongTermTrendDto) = saveSingle(Keys.LONG_TERM_TREND, v)

    suspend fun saveReview(weekStart: String, review: ReviewOutDto) {
        context.cadenceDataStore.edit { prefs ->
            val current = prefs.decodeMap<ReviewOutDto>(Keys.REVIEWS)
            prefs[Keys.REVIEWS] = json.encodeToString(current + (weekStart to review))
        }
    }

    suspend fun saveWeekScheduleDay(date: String, blocks: List<ScheduleBlockDto>) {
        context.cadenceDataStore.edit { prefs ->
            val current = prefs.decodeMap<List<ScheduleBlockDto>>(Keys.WEEK_SCHEDULE)
            prefs[Keys.WEEK_SCHEDULE] = json.encodeToString(current + (date to blocks))
        }
    }

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

    /** Replaces any existing pending entry for the same date -- see
     * [PendingDayEntry]'s doc. */
    suspend fun enqueuePendingDayEntry(pending: PendingDayEntry) {
        context.cadenceDataStore.edit { prefs ->
            val current = prefs.decodeList<PendingDayEntry>(Keys.PENDING_DAY_ENTRIES)
            prefs[Keys.PENDING_DAY_ENTRIES] = json.encodeToString(current.filterNot { it.date == pending.date } + pending)
        }
    }

    suspend fun removePendingDayEntry(date: String) {
        context.cadenceDataStore.edit { prefs ->
            val current = prefs.decodeList<PendingDayEntry>(Keys.PENDING_DAY_ENTRIES)
            prefs[Keys.PENDING_DAY_ENTRIES] = json.encodeToString(current.filterNot { it.date == date })
        }
    }

    // --- Categories ------------------------------------------------------------

    suspend fun setPendingCategoryCreates(v: List<PendingCategoryCreate>) = saveList(Keys.PENDING_CATEGORY_CREATES, v)
    suspend fun setPendingCategoryUpdates(v: List<PendingCategoryUpdate>) = saveList(Keys.PENDING_CATEGORY_UPDATES, v)
    suspend fun setPendingCategoryDeletes(v: List<PendingCategoryDelete>) = saveList(Keys.PENDING_CATEGORY_DELETES, v)

    // --- Anchors ---------------------------------------------------------------

    suspend fun setPendingAnchorCreates(v: List<PendingAnchorCreate>) = saveList(Keys.PENDING_ANCHOR_CREATES, v)
    suspend fun setPendingAnchorUpdates(v: List<PendingAnchorUpdate>) = saveList(Keys.PENDING_ANCHOR_UPDATES, v)
    suspend fun setPendingAnchorDeletes(v: List<PendingAnchorDelete>) = saveList(Keys.PENDING_ANCHOR_DELETES, v)

    // --- Events ------------------------------------------------------------------

    suspend fun setPendingEventCreates(v: List<PendingEventCreate>) = saveList(Keys.PENDING_EVENT_CREATES, v)
    suspend fun setPendingEventDeletes(v: List<PendingEventDelete>) = saveList(Keys.PENDING_EVENT_DELETES, v)

    // --- Profile -------------------------------------------------------------------

    suspend fun setPendingProfileUpdate(v: PendingProfileUpdate?) {
        context.cadenceDataStore.edit { prefs ->
            if (v == null) prefs.remove(Keys.PENDING_PROFILE_UPDATE) else prefs[Keys.PENDING_PROFILE_UPDATE] = json.encodeToString(v)
        }
    }

    // --- Weekly review -----------------------------------------------------------

    suspend fun setPendingReviewSaves(v: List<PendingReviewSave>) = saveList(Keys.PENDING_REVIEW_SAVES, v)

    /** Clears everything -- called on sign-out so a different account
     * signing in next never sees a stale previous user's cache. */
    suspend fun clearAll() {
        context.cadenceDataStore.edit { it.clear() }
    }

    private inline fun <reified T> single(key: Preferences.Key<String>): Flow<T?> =
        context.cadenceDataStore.data.map { it.decode(key) }

    private inline fun <reified T> list(key: Preferences.Key<String>): Flow<List<T>> =
        context.cadenceDataStore.data.map { it.decodeList(key) }

    private inline fun <reified T> map(key: Preferences.Key<String>): Flow<Map<String, T>> =
        context.cadenceDataStore.data.map { it.decodeMap(key) }

    private suspend inline fun <reified T> saveSingle(key: Preferences.Key<String>, value: T) =
        context.cadenceDataStore.edit { it[key] = json.encodeToString(value) }

    private suspend inline fun <reified T> saveList(key: Preferences.Key<String>, value: List<T>) =
        context.cadenceDataStore.edit { it[key] = json.encodeToString(value) }

    private suspend inline fun <reified T> saveMap(key: Preferences.Key<String>, value: Map<String, T>) =
        context.cadenceDataStore.edit { it[key] = json.encodeToString(value) }

    private inline fun <reified T> Preferences.decode(key: Preferences.Key<String>): T? =
        this[key]?.let { json.decodeFromString<T>(it) }

    private inline fun <reified T> Preferences.decodeList(key: Preferences.Key<String>): List<T> =
        this[key]?.let { json.decodeFromString<List<T>>(it) } ?: emptyList()

    private inline fun <reified T> Preferences.decodeMap(key: Preferences.Key<String>): Map<String, T> =
        this[key]?.let { json.decodeFromString<Map<String, T>>(it) } ?: emptyMap()
}
