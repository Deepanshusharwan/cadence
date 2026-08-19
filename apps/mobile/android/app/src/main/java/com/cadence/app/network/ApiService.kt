package com.cadence.app.network

import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.network.dto.LeaveBalanceDto
import com.cadence.app.network.dto.ScheduleBlockDto
import com.cadence.app.network.dto.SessionCreateDto
import com.cadence.app.network.dto.SessionDto
import com.cadence.app.network.dto.UserDto
import com.cadence.app.network.dto.UserUpdateDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST

/**
 * Phase 1 surface only -- Today + Timer + minimal Settings (see
 * docs/architecture.md's mobile status paragraph). The rest of
 * backend/app/routers (anchors, events, day_types, reviews, sharing,
 * calendar_feed, export, billing, admin) is deliberately not wired up yet.
 */
interface ApiService {
    @GET("me")
    suspend fun getMe(): UserDto

    @PATCH("me")
    suspend fun updateMe(@Body patch: UserUpdateDto): UserDto

    @GET("categories")
    suspend fun getCategories(): List<CategoryDto>

    @GET("today")
    suspend fun getToday(): List<ScheduleBlockDto>

    @GET("leave")
    suspend fun getLeaveBalance(): LeaveBalanceDto

    @GET("sessions")
    suspend fun getSessions(): List<SessionDto>

    @POST("sessions")
    suspend fun createSession(@Body session: SessionCreateDto): SessionDto
}
