package com.cadence.app.ui.calendar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadence.app.data.CadenceRepository
import com.cadence.app.network.ApiResult
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.network.dto.EventCreateDto
import com.cadence.app.network.dto.EventDto
import com.cadence.app.network.dto.ScheduleBlockDto
import com.cadence.app.network.dto.SessionDto
import java.time.LocalDate
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class CalendarViewMode { DAY, WEEK, MONTH }

data class DayTypeMeta(val label: String, val cost: String)

/** Mirrors apps/web/src/app/dashboard/calendar/page.tsx's DAY_TYPE_META
 * exactly (label + leave-unit cost per type). */
val DAY_TYPE_ORDER = listOf("NORMAL", "REDUCED", "LEAVE", "MISSED")
val DAY_TYPE_META = mapOf(
    "NORMAL" to DayTypeMeta("Normal", "0 units"),
    "REDUCED" to DayTypeMeta("Lighter", "1 unit"),
    "LEAVE" to DayTypeMeta("Full Leave", "2 units"),
    "MISSED" to DayTypeMeta("Missed", "0 units"),
)

data class CalendarUiState(
    val viewMode: CalendarViewMode = CalendarViewMode.WEEK,
    val anchorDate: LocalDate = LocalDate.now(),
    val sessions: List<SessionDto> = emptyList(),
    val categories: List<CategoryDto> = emptyList(),
    val dayTypes: Map<String, String> = emptyMap(),
    val events: List<EventDto> = emptyList(),
    val currentStreakDates: Set<String> = emptySet(),
    val longestStreakDates: Set<String> = emptySet(),
    val dayBlocks: List<ScheduleBlockDto> = emptyList(),
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
)

/** Backs the Calendar screen (spec §97): Day/Week/Month views, mirroring
 * apps/web/src/app/dashboard/calendar/page.tsx's three-mode layout. Unlike
 * the old single-week version, Week/Month render entirely from
 * [CadenceRepository]'s already-cached, all-time sessions/dayTypes/streaks
 * (same client-side-filter approach web uses -- GET /sessions and
 * GET /day-types return everything, not a date-windowed slice, so no new
 * endpoints are needed). Day view additionally fetches that one date's
 * server-computed schedule (anchors/focus blocks) via GET /today, which
 * sessions/dayTypes alone can't reconstruct. */
class CalendarViewModel(private val repository: CadenceRepository) : ViewModel() {
    private val _viewMode = MutableStateFlow(CalendarViewMode.WEEK)
    private val _anchorDate = MutableStateFlow(LocalDate.now())
    private val _dayBlocks = MutableStateFlow<List<ScheduleBlockDto>>(emptyList())
    private val _isRefreshing = MutableStateFlow(false)
    private val _errorMessage = MutableStateFlow<String?>(null)

    val uiState: StateFlow<CalendarUiState> = combine(
        _viewMode, _anchorDate, repository.sessions, repository.categories,
        repository.dayTypes, repository.events, repository.streaks,
        _dayBlocks, _isRefreshing, _errorMessage,
    ) { values ->
        @Suppress("UNCHECKED_CAST")
        val viewMode = values[0] as CalendarViewMode
        val anchorDate = values[1] as LocalDate
        val sessions = values[2] as List<SessionDto>
        val categories = values[3] as List<CategoryDto>
        val dayTypes = values[4] as Map<String, String>
        val events = values[5] as List<EventDto>
        val streaks = values[6] as com.cadence.app.network.dto.StreakInfoDto?
        val dayBlocks = values[7] as List<ScheduleBlockDto>
        val refreshing = values[8] as Boolean
        val error = values[9] as String?
        CalendarUiState(
            viewMode = viewMode,
            anchorDate = anchorDate,
            sessions = sessions,
            categories = categories,
            dayTypes = dayTypes,
            events = events,
            currentStreakDates = streaks?.current?.dates?.toSet() ?: emptySet(),
            longestStreakDates = streaks?.longest?.dates?.toSet() ?: emptySet(),
            dayBlocks = dayBlocks,
            isRefreshing = refreshing,
            errorMessage = error,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), CalendarUiState())

    init {
        viewModelScope.launch { repository.refreshAll() }
        refreshDay()
    }

    fun setViewMode(mode: CalendarViewMode) {
        _viewMode.value = mode
    }

    /** dir: -1 (prev) / +1 (next) -- step size depends on the active view,
     * mirrors web's navigate(dir). */
    fun navigate(dir: Int) {
        _anchorDate.value = when (_viewMode.value) {
            CalendarViewMode.DAY -> _anchorDate.value.plusDays(dir.toLong())
            CalendarViewMode.WEEK -> _anchorDate.value.plusWeeks(dir.toLong())
            CalendarViewMode.MONTH -> _anchorDate.value.plusMonths(dir.toLong())
        }
        refreshDay()
    }

    fun jumpToday() {
        _anchorDate.value = LocalDate.now()
        refreshDay()
    }

    /** Selecting any day (a week card's header, a month cell) jumps into
     * Day view for that date -- mirrors web's goToDay. */
    fun selectDay(date: LocalDate) {
        _anchorDate.value = date
        _viewMode.value = CalendarViewMode.DAY
        refreshDay()
    }

    fun setDayType(date: LocalDate, dayType: String) {
        viewModelScope.launch { repository.setDayType(date.toString(), dayType) }
    }

    /** Week/Month's tap-to-cycle (vs. Day view's explicit 4-button pick). */
    fun cycleDayType(date: LocalDate, current: String) {
        val next = DAY_TYPE_ORDER[(DAY_TYPE_ORDER.indexOf(current) + 1) % DAY_TYPE_ORDER.size]
        setDayType(date, next)
    }

    fun addEvent(date: LocalDate, title: String, start: String, end: String, type: String) {
        if (title.isBlank() || start.isBlank() || end.isBlank()) return
        viewModelScope.launch {
            repository.createEvent(EventCreateDto(title = title.trim(), date = date.toString(), start = start, end = end, type = type))
        }
    }

    fun deleteEvent(id: String) {
        viewModelScope.launch { repository.deleteEvent(id) }
    }

    fun dismissError() {
        _errorMessage.value = null
    }

    /** Only Day view needs a network fetch (the server-computed anchor/focus
     * schedule) -- called on init and whenever anchorDate/viewMode changes
     * into DAY, so navigating Week/Month never fires a request. */
    private fun refreshDay() {
        viewModelScope.launch {
            _isRefreshing.value = true
            when (val result = repository.refreshWeek(listOf(_anchorDate.value.toString()))) {
                is ApiResult.Success -> {
                    _errorMessage.value = null
                    _dayBlocks.value = repository.weekSchedule.first()[_anchorDate.value.toString()].orEmpty()
                }
                is ApiResult.Failure -> _errorMessage.value = result.message
            }
            _isRefreshing.value = false
        }
    }
}
