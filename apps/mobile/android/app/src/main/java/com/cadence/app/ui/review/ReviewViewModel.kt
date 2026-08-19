package com.cadence.app.ui.review

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadence.app.data.CadenceRepository
import com.cadence.app.data.WeekMath
import com.cadence.app.network.ApiResult
import com.cadence.app.network.dto.ReviewOutDto
import java.time.LocalDate
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class ReviewUiState(
    val weekStart: String = "",
    val wins: String = "",
    val problems: String = "",
    val nextWeekChanges: String = "",
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
)

/** Backs the Weekly Review screen (spec §52). Not offline-critical (see the
 * mobile build plan's offline scope: only session logging and day-type
 * marking need to work with no connection) -- this is a plain network
 * read/write, same as the web app's own review page. */
class ReviewViewModel(private val repository: CadenceRepository) : ViewModel() {
    private val weekStart = WeekMath.startOfWeek(LocalDate.now()).toString()

    private val _wins = MutableStateFlow("")
    private val _problems = MutableStateFlow("")
    private val _nextWeekChanges = MutableStateFlow("")
    private val _isSaving = MutableStateFlow(false)
    private val _errorMessage = MutableStateFlow<String?>(null)

    val uiState: StateFlow<ReviewUiState> = combine(_wins, _problems, _nextWeekChanges, _isSaving, _errorMessage) {
        wins, problems, nextWeekChanges, saving, error ->
        ReviewUiState(weekStart, wins, problems, nextWeekChanges, saving, error)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ReviewUiState(weekStart = weekStart))

    init {
        viewModelScope.launch {
            // Cache-first: show whatever was last saved/loaded for this week
            // immediately, then refresh from the network in the background.
            applyReview(repository.reviews.first()[weekStart])
            when (val result = repository.loadReview(weekStart)) {
                is ApiResult.Success -> applyReview(repository.reviews.first()[weekStart])
                is ApiResult.Failure -> _errorMessage.value = result.message
            }
        }
    }

    private fun applyReview(review: ReviewOutDto?) {
        review ?: return
        _wins.value = review.wins
        _problems.value = review.problems
        _nextWeekChanges.value = review.nextWeekChanges
    }

    fun updateWins(value: String) { _wins.value = value }
    fun updateProblems(value: String) { _problems.value = value }
    fun updateNextWeekChanges(value: String) { _nextWeekChanges.value = value }

    fun save() {
        viewModelScope.launch {
            _isSaving.value = true
            val result = repository.saveReview(weekStart, _wins.value, _problems.value, _nextWeekChanges.value)
            _errorMessage.value = (result as? ApiResult.Failure)?.message
            _isSaving.value = false
        }
    }
}
