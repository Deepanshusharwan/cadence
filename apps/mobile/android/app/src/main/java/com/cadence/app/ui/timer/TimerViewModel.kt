package com.cadence.app.ui.timer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadence.app.data.CadenceRepository
import com.cadence.app.data.local.ThemePreferences
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.notifications.TimerNotifier
import java.time.LocalDate
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface TimerRunState {
    data object Idle : TimerRunState
    data class Running(val startedAtEpochMs: Long, val elapsedSeconds: Int) : TimerRunState
}

data class TimerUiState(
    val categories: List<CategoryDto> = emptyList(),
    val selectedCategoryId: String? = null,
    val runState: TimerRunState = TimerRunState.Idle,
    val lastLoggedMessage: String? = null,
    val isPlus: Boolean = false,
    val watchFace: String = "chronograph",
)

/** Backs the Timer screen (spec §43-44, §98): start/stop a live session, or
 * log one manually. Either path writes through [CadenceRepository.logSession],
 * which queues to the offline outbox first -- so this works exactly the
 * same whether the phone has a connection or not. */
class TimerViewModel(private val repository: CadenceRepository, private val themePreferences: ThemePreferences) : ViewModel() {
    private val _state = MutableStateFlow(TimerUiState())
    val state: StateFlow<TimerUiState> = _state.asStateFlow()

    private var tickJob: Job? = null

    init {
        viewModelScope.launch {
            repository.categories.collect { categories ->
                val pending = repository.consumePendingTimerCategory()
                _state.value = _state.value.copy(
                    categories = categories,
                    selectedCategoryId = pending ?: _state.value.selectedCategoryId ?: categories.firstOrNull()?.id,
                )
            }
        }
        viewModelScope.launch {
            repository.profile.collect { profile ->
                _state.value = _state.value.copy(isPlus = profile?.plan != null && profile.plan != "free")
            }
        }
        // Watch-face pick is device-level and Plus-gated (see
        // ui/timer/WatchFaces.kt) -- free accounts always render
        // "chronograph" regardless of what's stored, same as web falling
        // back to its default face when plan === "free".
        viewModelScope.launch {
            themePreferences.watchFace.collect { key ->
                _state.value = _state.value.copy(watchFace = key)
            }
        }
    }

    fun setWatchFace(key: String) {
        viewModelScope.launch { themePreferences.setWatchFace(key) }
    }

    fun selectCategory(categoryId: String) {
        _state.value = _state.value.copy(selectedCategoryId = categoryId)
    }

    fun startTimer() {
        if (_state.value.runState is TimerRunState.Running) return
        val startedAt = System.currentTimeMillis()
        val name = _state.value.categories.firstOrNull { it.id == _state.value.selectedCategoryId }?.name ?: "session"
        _state.value = _state.value.copy(
            runState = TimerRunState.Running(startedAt, 0),
            lastLoggedMessage = "Timer started — $name",
        )
        TimerNotifier.update(repository.appContext, name, 0)
        tickJob?.cancel()
        tickJob = viewModelScope.launch {
            while (true) {
                delay(1_000)
                val running = _state.value.runState as? TimerRunState.Running ?: break
                val elapsed = running.elapsedSeconds + 1
                _state.value = _state.value.copy(runState = running.copy(elapsedSeconds = elapsed))
                TimerNotifier.update(repository.appContext, name, elapsed)
            }
        }
    }

    fun stopAndLog() {
        val running = _state.value.runState as? TimerRunState.Running ?: return
        tickJob?.cancel()
        TimerNotifier.clear(repository.appContext)
        val minutes = (running.elapsedSeconds / 60).coerceAtLeast(1)
        _state.value = _state.value.copy(runState = TimerRunState.Idle)
        logMinutes(minutes)
    }

    fun cancelTimer() {
        tickJob?.cancel()
        TimerNotifier.clear(repository.appContext)
        _state.value = _state.value.copy(runState = TimerRunState.Idle)
    }

    fun logManual(minutes: Int) {
        if (minutes <= 0) return
        logMinutes(minutes)
    }

    private fun logMinutes(minutes: Int) {
        val categoryId = _state.value.selectedCategoryId ?: return
        val category = _state.value.categories.firstOrNull { it.id == categoryId }
        viewModelScope.launch {
            repository.logSession(categoryId = categoryId, date = LocalDate.now().toString(), durationMinutes = minutes)
            // Mirrors apps/web/src/app/dashboard/page.tsx's logManualFor: a
            // sessions-tracked item needs >=45min (spec §7.2) to actually
            // count toward this week, so say so rather than silently
            // logging time that won't move the weekly total.
            val belowThreshold = category?.trackingMode == "sessions" && minutes < 45
            val name = category?.name ?: "item"
            _state.value = _state.value.copy(
                lastLoggedMessage = if (belowThreshold) {
                    "Logged ${minutes}m to $name — under 45m, won't count toward this week"
                } else {
                    "Logged ${minutes}m to $name"
                },
            )
        }
    }

    fun dismissMessage() {
        _state.value = _state.value.copy(lastLoggedMessage = null)
    }
}
