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
data class UserUpdateDto(
    val name: String? = null,
    val avatar: String? = null,
    val timezone: String? = null,
    @SerialName("wake_start") val wakeStart: String? = null,
    @SerialName("wake_end") val wakeEnd: String? = null,
    @SerialName("leave_monthly_allowance") val leaveMonthlyAllowance: Int? = null,
    @SerialName("leave_carry_cap") val leaveCarryCap: Int? = null,
    @SerialName("notifications_enabled") val notificationsEnabled: Boolean? = null,
    val onboarded: Boolean? = null,
)
