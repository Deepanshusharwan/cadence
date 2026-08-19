package com.cadence.app.ui.progress

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadence.app.data.CadenceRepository
import com.cadence.app.data.WeekMath
import com.cadence.app.network.ApiResult
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.network.dto.InsightDto
import com.cadence.app.network.dto.LongTermTrendDto
import com.cadence.app.network.dto.SessionDto
import com.cadence.app.network.dto.StreakInfoDto
import com.cadence.app.network.dto.UserDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class WeeklyItemProgress(
    val category: CategoryDto,
    val weeklyMinutes: Int,
    val weeklySessionCount: Int,
)

data class ProgressUiState(
    val weekly: List<WeeklyItemProgress> = emptyList(),
    val streaks: StreakInfoDto? = null,
    val insights: List<InsightDto> = emptyList(),
    val longTermTrend: LongTermTrendDto? = null,
    val isPlus: Boolean = false,
    val isRefreshing: Boolean = true,
)

private data class ProgressCore(
    val categories: List<CategoryDto>,
    val sessions: List<SessionDto>,
    val streaks: StreakInfoDto?,
    val insights: List<InsightDto>,
)

/** Backs the Progress screen (spec §99): this week's per-item totals,
 * streaks, insights, and (Plus-only) the long-term trend from
 * `GET /analytics/long-term`. Simplified from the web app's Week/Month/
 * Long-term tabs to Week + streaks/insights + long-term -- see the mobile
 * build plan; a "this calendar month" view isn't built yet. */
class ProgressViewModel(private val repository: CadenceRepository) : ViewModel() {
    private val _isRefreshing = MutableStateFlow(true)

    private val core = combine(
        repository.categories,
        repository.sessions,
        repository.streaks,
        repository.insights,
    ) { categories, sessions, streaks, insights ->
        ProgressCore(categories, sessions, streaks, insights)
    }

    private val withTrendAndProfile = combine(
        core,
        repository.longTermTrend,
        repository.profile,
    ) { c, trend, profile ->
        ProgressUiState(
            weekly = c.categories.map { category ->
                WeeklyItemProgress(
                    category = category,
                    weeklyMinutes = WeekMath.weeklyMinutes(c.sessions, category.id),
                    weeklySessionCount = WeekMath.weeklySessionCount(c.sessions, category.id),
                )
            },
            streaks = c.streaks,
            insights = c.insights,
            longTermTrend = trend,
            isPlus = profile.isPlus(),
        )
    }

    val uiState: StateFlow<ProgressUiState> = combine(withTrendAndProfile, _isRefreshing) { state, refreshing ->
        state.copy(isRefreshing = refreshing)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ProgressUiState())

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            when (repository.refreshAll()) {
                is ApiResult.Success -> maybeRefreshLongTerm()
                is ApiResult.Failure -> Unit
            }
            _isRefreshing.value = false
        }
    }

    private suspend fun maybeRefreshLongTerm() {
        if (uiState.value.isPlus) repository.refreshLongTermTrend()
    }
}

private fun UserDto?.isPlus(): Boolean = this != null && plan != "free"
