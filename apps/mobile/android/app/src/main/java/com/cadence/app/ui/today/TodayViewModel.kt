package com.cadence.app.ui.today

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadence.app.data.CadenceRepository
import com.cadence.app.data.WeekMath
import com.cadence.app.network.ApiResult
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.network.dto.LeaveBalanceDto
import com.cadence.app.network.dto.ScheduleBlockDto
import com.cadence.app.network.dto.SessionDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class CategoryProgress(
    val category: CategoryDto,
    val weeklyMinutes: Int,
    val weeklySessionCount: Int,
    val previousWeeklyMinutes: Int,
    val previousWeeklySessionCount: Int,
) {
    /** Mirrors the web dashboard's `deficit <= 0` check (deficit = target -
     * current) used for the "N/M on track this week" summary chip. Only
     * meaningful when `category.weeklyTarget != null`. */
    val isOnTrack: Boolean
        get() {
            val target = category.weeklyTarget ?: return false
            val current = if (category.trackingMode == "hours") weeklyMinutes / 60.0 else weeklySessionCount.toDouble()
            return current >= target
        }
}

private data class TodayData(
    val schedule: List<ScheduleBlockDto>,
    val leaveBalance: LeaveBalanceDto?,
    val categories: List<CategoryDto>,
    val sessions: List<SessionDto>,
)

data class TodayUiState(
    val schedule: List<ScheduleBlockDto> = emptyList(),
    val leaveBalance: LeaveBalanceDto? = null,
    val progress: List<CategoryProgress> = emptyList(),
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
)

/** Backs the Today screen (spec §96): day's schedule, leave balance, and
 * per-item weekly progress -- the last one computed client-side from
 * cached sessions/categories exactly like apps/web/src/app/dashboard/page.tsx's
 * `progress`/`CategoryProgress` (see data/WeekMath.kt), since it isn't one of
 * the server-computed endpoints. Every item is included, not just ones with
 * a weekly target -- a no-target item still shows progress against its own
 * previous week's total instead of a permanently-empty bar. */
class TodayViewModel(private val repository: CadenceRepository) : ViewModel() {
    private val _isRefreshing = MutableStateFlow(true)
    private val _errorMessage = MutableStateFlow<String?>(null)

    private val data = combine(
        repository.todaySchedule,
        repository.leaveBalance,
        repository.categories,
        repository.sessions,
    ) { schedule, leave, categories, sessions ->
        TodayData(schedule, leave, categories, sessions)
    }

    val uiState: StateFlow<TodayUiState> = combine(data, _isRefreshing, _errorMessage) { d, refreshing, error ->
        TodayUiState(
            schedule = d.schedule,
            leaveBalance = d.leaveBalance,
            progress = d.categories.map { category ->
                CategoryProgress(
                    category = category,
                    weeklyMinutes = WeekMath.weeklyMinutes(d.sessions, category.id),
                    weeklySessionCount = WeekMath.weeklySessionCount(d.sessions, category.id),
                    previousWeeklyMinutes = WeekMath.previousWeeklyMinutes(d.sessions, category.id),
                    previousWeeklySessionCount = WeekMath.previousWeeklySessionCount(d.sessions, category.id),
                )
            },
            isRefreshing = refreshing,
            errorMessage = error,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), TodayUiState())

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            when (val result = repository.refreshAll()) {
                is ApiResult.Success -> _errorMessage.value = null
                is ApiResult.Failure -> _errorMessage.value = result.message
            }
            _isRefreshing.value = false
        }
    }
}
