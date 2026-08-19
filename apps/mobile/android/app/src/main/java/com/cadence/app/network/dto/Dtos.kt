package com.cadence.app.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Wire DTOs -- field-for-field matches of backend/app/schemas.py's response
 * models and request bodies (verified against that file directly, not
 * guessed). snake_case on the wire, kept as snake_case here too (unlike
 * apps/web/src/lib/api.ts's *FromWire camelCase mappers) since Kotlin
 * doesn't have the same naming-convention expectation JS does -- @SerialName
 * only where the Kotlin-idiomatic name would otherwise change the wire name.
 */

@Serializable
data class UserDto(
    val id: String,
    val name: String,
    val avatar: String,
    @SerialName("accent_color") val accentColor: String,
    val timezone: String,
    @SerialName("wake_start") val wakeStart: String,
    @SerialName("wake_end") val wakeEnd: String,
    @SerialName("leave_monthly_allowance") val leaveMonthlyAllowance: Int,
    @SerialName("leave_carry_cap") val leaveCarryCap: Int,
    @SerialName("notifications_enabled") val notificationsEnabled: Boolean,
    val onboarded: Boolean,
    val plan: String,
)

@Serializable
data class CategoryDto(
    val id: String,
    val name: String,
    @SerialName("tracking_mode") val trackingMode: String, // "hours" | "sessions"
    @SerialName("weekly_target") val weeklyTarget: Double? = null,
    @SerialName("priority_tier") val priorityTier: Int = 1,
    @SerialName("weekend_preferred") val weekendPreferred: Boolean = false,
    val color: String,
)

@Serializable
data class ScheduleBlockDto(
    val start: String, // "HH:MM", sortable
    val time: String, // "HH:MM–HH:MM" display range
    val label: String,
    val dim: Boolean,
    @SerialName("is_event") val isEvent: Boolean,
)

@Serializable
data class LeaveBalanceDto(
    @SerialName("monthly_allowance") val monthlyAllowance: Int,
    val carried: Int,
    @SerialName("total_available") val totalAvailable: Int,
    val used: Int,
    val remaining: Int,
    val cap: Int,
)

@Serializable
data class SessionDto(
    val id: String,
    @SerialName("category_id") val categoryId: String?,
    val date: String, // "YYYY-MM-DD"
    @SerialName("duration_minutes") val durationMinutes: Int,
    val tags: List<String> = emptyList(),
)

@Serializable
data class SessionCreateDto(
    @SerialName("category_id") val categoryId: String,
    val date: String,
    @SerialName("duration_minutes") val durationMinutes: Int,
    val tags: List<String> = emptyList(),
)

@Serializable
data class DayEntryDto(
    val date: String,
    @SerialName("day_type") val dayType: String, // NORMAL | REDUCED | LEAVE | MISSED
)

@Serializable
data class CategoryCreateDto(
    val name: String,
    @SerialName("tracking_mode") val trackingMode: String,
    @SerialName("weekly_target") val weeklyTarget: Double? = null,
    @SerialName("priority_tier") val priorityTier: Int = 1,
    @SerialName("weekend_preferred") val weekendPreferred: Boolean = false,
)

@Serializable
data class CategoryUpdateDto(
    val name: String? = null,
    @SerialName("tracking_mode") val trackingMode: String? = null,
    @SerialName("weekly_target") val weeklyTarget: Double? = null,
    @SerialName("priority_tier") val priorityTier: Int? = null,
    @SerialName("weekend_preferred") val weekendPreferred: Boolean? = null,
)

@Serializable
data class AnchorDto(
    val id: String,
    val label: String,
    val start: String,
    val end: String,
    val recurrence: String, // "daily" | "weekly" | "once"
    @SerialName("days_of_week") val daysOfWeek: List<Int> = emptyList(),
    val date: String? = null,
    @SerialName("is_focus_block") val isFocusBlock: Boolean = true,
    @SerialName("category_ids") val categoryIds: List<String> = emptyList(),
)

@Serializable
data class AnchorCreateDto(
    val label: String,
    val start: String,
    val end: String,
    val recurrence: String,
    @SerialName("days_of_week") val daysOfWeek: List<Int> = emptyList(),
    val date: String? = null,
    @SerialName("is_focus_block") val isFocusBlock: Boolean = true,
    @SerialName("category_ids") val categoryIds: List<String> = emptyList(),
)

@Serializable
data class AnchorUpdateDto(
    val label: String? = null,
    val start: String? = null,
    val end: String? = null,
    val recurrence: String? = null,
    @SerialName("days_of_week") val daysOfWeek: List<Int>? = null,
    val date: String? = null,
    @SerialName("is_focus_block") val isFocusBlock: Boolean? = null,
    @SerialName("category_ids") val categoryIds: List<String>? = null,
)

@Serializable
data class EventDto(
    val id: String,
    val title: String,
    val date: String,
    val start: String,
    val end: String,
    val type: String, // SCHOOL_OR_WORK | SOCIAL | PERSONAL | TRAVEL | OTHER
    val notes: String = "",
)

@Serializable
data class EventCreateDto(
    val title: String,
    val date: String,
    val start: String,
    val end: String,
    val type: String,
    val notes: String = "",
)

@Serializable
data class DayEntrySetDto(
    @SerialName("day_type") val dayType: String,
)

@Serializable
data class ReviewOutDto(
    @SerialName("week_start") val weekStart: String,
    val wins: String,
    val problems: String,
    @SerialName("next_week_changes") val nextWeekChanges: String,
)

@Serializable
data class ReviewUpsertDto(
    val wins: String? = null,
    val problems: String? = null,
    @SerialName("next_week_changes") val nextWeekChanges: String? = null,
)

@Serializable
data class StreakRunDto(
    val length: Int,
    val dates: List<String> = emptyList(),
)

@Serializable
data class StreakInfoDto(
    val current: StreakRunDto,
    val longest: StreakRunDto,
)

@Serializable
data class InsightDto(
    val id: String,
    val text: String,
)

@Serializable
data class MonthlyCategoryTotalDto(
    val month: String, // "YYYY-MM"
    @SerialName("category_id") val categoryId: String,
    val minutes: Int,
    @SerialName("session_count") val sessionCount: Int,
)

@Serializable
data class MonthlyConsistencyDto(
    val month: String,
    val pct: Int,
)

@Serializable
data class LongTermTrendDto(
    val months: List<MonthlyCategoryTotalDto>,
    @SerialName("monthly_consistency_pct") val monthlyConsistencyPct: List<MonthlyConsistencyDto>,
)

@Serializable
data class UserUpdateDto(
    val name: String? = null,
    val avatar: String? = null,
    @SerialName("accent_color") val accentColor: String? = null,
    val timezone: String? = null,
    @SerialName("wake_start") val wakeStart: String? = null,
    @SerialName("wake_end") val wakeEnd: String? = null,
    @SerialName("leave_monthly_allowance") val leaveMonthlyAllowance: Int? = null,
    @SerialName("leave_carry_cap") val leaveCarryCap: Int? = null,
    @SerialName("notifications_enabled") val notificationsEnabled: Boolean? = null,
    val onboarded: Boolean? = null,
)
