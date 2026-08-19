package com.cadence.app.ui.calendar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadence.app.data.CadenceRepository
import com.cadence.app.data.WeekMath
import com.cadence.app.network.ApiResult
import com.cadence.app.network.dto.EventCreateDto
import com.cadence.app.network.dto.ScheduleBlockDto
import java.time.LocalDate
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class CalendarDay(val date: String, val label: String, val isToday: Boolean)

data class CalendarUiState(
    val days: List<CalendarDay> = emptyList(),
    val selectedDate: String = "",
    val blocks: List<ScheduleBlockDto> = emptyList(),
    val isRefreshing: Boolean = true,
    val errorMessage: String? = null,
)

/** Backs the Calendar/Week screen (spec §97) -- a simplified Week view
 * (Day/Month views from the web app aren't built yet, see the mobile build
 * plan). Shows each day's server-computed schedule (fixed blocks, focus
 * blocks, and events all merged, same as Today) rather than re-deriving it
 * client-side. */
class CalendarViewModel(private val repository: CadenceRepository) : ViewModel() {
    private val weekDates: List<String> = (0..6).map { WeekMath.startOfWeek().plusDays(it.toLong()).toString() }

    private val _selectedDate = MutableStateFlow(LocalDate.now().toString())
    private val _isRefreshing = MutableStateFlow(true)
    private val _errorMessage = MutableStateFlow<String?>(null)

    val uiState: StateFlow<CalendarUiState> = combine(
        _selectedDate,
        repository.weekSchedule,
        _isRefreshing,
        _errorMessage,
    ) { selected, schedule, refreshing, error ->
        CalendarUiState(
            days = weekDates.map { date ->
                CalendarDay(date = date, label = LocalDate.parse(date).dayOfWeek.name.take(3), isToday = date == LocalDate.now().toString())
            },
            selectedDate = selected,
            blocks = schedule[selected].orEmpty(),
            isRefreshing = refreshing,
            errorMessage = error,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), CalendarUiState())

    init {
        refresh()
    }

    fun selectDay(date: String) {
        _selectedDate.value = date
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            when (val result = repository.refreshWeek(weekDates)) {
                is ApiResult.Success -> _errorMessage.value = null
                is ApiResult.Failure -> _errorMessage.value = result.message
            }
            _isRefreshing.value = false
        }
    }

    fun addEvent(title: String, start: String, end: String, type: String) {
        if (title.isBlank() || start.isBlank() || end.isBlank()) return
        viewModelScope.launch {
            val result = repository.createEvent(
                EventCreateDto(title = title.trim(), date = _selectedDate.value, start = start, end = end, type = type)
            )
            if (result is ApiResult.Success) refresh()
        }
    }
}
