package com.cadence.app.network

import com.cadence.app.network.dto.AnchorCreateDto
import com.cadence.app.network.dto.AnchorDto
import com.cadence.app.network.dto.AnchorUpdateDto
import com.cadence.app.network.dto.CategoryCreateDto
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.network.dto.CategoryUpdateDto
import com.cadence.app.network.dto.DayEntryDto
import com.cadence.app.network.dto.DayEntrySetDto
import com.cadence.app.network.dto.EventCreateDto
import com.cadence.app.network.dto.EventDto
import com.cadence.app.network.dto.InsightDto
import com.cadence.app.network.dto.LeaveBalanceDto
import com.cadence.app.network.dto.LongTermTrendDto
import com.cadence.app.network.dto.ReviewOutDto
import com.cadence.app.network.dto.ReviewUpsertDto
import com.cadence.app.network.dto.ScheduleBlockDto
import com.cadence.app.network.dto.SessionCreateDto
import com.cadence.app.network.dto.SessionDto
import com.cadence.app.network.dto.StreakInfoDto
import com.cadence.app.network.dto.UserDto
import com.cadence.app.network.dto.UserUpdateDto
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Covers Today/Timer/Settings plus item (category) management, leave/day-type
 * marking, weekly review, calendar (anchors + events), and progress/analytics
 * -- see docs/architecture.md's mobile status paragraph. Deliberately still
 * not wired up: sharing, calendar-feed, export, billing, admin/feedback,
 * notifications (lower priority, not core to web-UI parity).
 */
interface ApiService {
    @GET("me")
    suspend fun getMe(): UserDto

    @PATCH("me")
    suspend fun updateMe(@Body patch: UserUpdateDto): UserDto

    @GET("categories")
    suspend fun getCategories(): List<CategoryDto>

    @POST("categories")
    suspend fun createCategory(@Body category: CategoryCreateDto): CategoryDto

    @PATCH("categories/{id}")
    suspend fun updateCategory(@Path("id") id: String, @Body patch: CategoryUpdateDto): CategoryDto

    @DELETE("categories/{id}")
    suspend fun deleteCategory(@Path("id") id: String)

    @GET("anchors")
    suspend fun getAnchors(): List<AnchorDto>

    @POST("anchors")
    suspend fun createAnchor(@Body anchor: AnchorCreateDto): AnchorDto

    @PATCH("anchors/{id}")
    suspend fun updateAnchor(@Path("id") id: String, @Body patch: AnchorUpdateDto): AnchorDto

    @DELETE("anchors/{id}")
    suspend fun deleteAnchor(@Path("id") id: String)

    @GET("events")
    suspend fun getEvents(): List<EventDto>

    @POST("events")
    suspend fun createEvent(@Body event: EventCreateDto): EventDto

    @DELETE("events/{id}")
    suspend fun deleteEvent(@Path("id") id: String)

    @GET("day-types")
    suspend fun getDayTypes(): List<DayEntryDto>

    @PUT("day-types/{onDate}")
    suspend fun setDayType(@Path("onDate") onDate: String, @Body body: DayEntrySetDto): DayEntryDto

    @GET("weekly-review/{weekStart}")
    suspend fun getWeeklyReview(@Path("weekStart") weekStart: String): ReviewOutDto

    @PUT("weekly-review/{weekStart}")
    suspend fun setWeeklyReview(@Path("weekStart") weekStart: String, @Body body: ReviewUpsertDto): ReviewOutDto

    @GET("today")
    suspend fun getToday(@Query("on_date") onDate: String? = null): List<ScheduleBlockDto>

    @GET("leave")
    suspend fun getLeaveBalance(): LeaveBalanceDto

    @GET("streaks")
    suspend fun getStreaks(): StreakInfoDto

    @GET("insights")
    suspend fun getInsights(): List<InsightDto>

    @GET("analytics/long-term")
    suspend fun getLongTermTrend(@Query("months") months: Int = 12): LongTermTrendDto

    @GET("sessions")
    suspend fun getSessions(): List<SessionDto>

    @POST("sessions")
    suspend fun createSession(@Body session: SessionCreateDto): SessionDto
}
