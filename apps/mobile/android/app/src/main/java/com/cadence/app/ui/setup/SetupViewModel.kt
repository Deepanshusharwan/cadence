package com.cadence.app.ui.setup

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadence.app.data.CadenceRepository
import com.cadence.app.network.ApiResult
import com.cadence.app.network.dto.AnchorCreateDto
import com.cadence.app.network.dto.AnchorDto
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.network.dto.UserUpdateDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

private data class SetupCore(
    val step: Int,
    val name: String,
    val categories: List<CategoryDto>,
    val anchors: List<AnchorDto>,
)

data class SetupUiState(
    val step: Int = 0,
    val name: String = "",
    val categories: List<CategoryDto> = emptyList(),
    val anchors: List<AnchorDto> = emptyList(),
    val isFinishing: Boolean = false,
    val errorMessage: String? = null,
) {
    val canProceed: Boolean
        get() = when (step) {
            0 -> name.isNotBlank()
            1 -> categories.isNotEmpty()
            else -> true
        }
}

private val RANDOM_NAMES = listOf("Alex", "Sam", "Jordan", "Riley", "Casey", "Morgan", "Taylor", "Avery")

/** Backs the onboarding wizard (spec's MVP flow, mirrors
 * apps/web/src/app/setup/page.tsx's 4 steps: Identity, Categories,
 * Schedule, Review). Shown by CadenceRoot whenever the signed-in user's
 * profile has `onboarded == false`. */
class SetupViewModel(private val repository: CadenceRepository) : ViewModel() {
    private val _step = MutableStateFlow(0)
    private val _name = MutableStateFlow("")
    private val _isFinishing = MutableStateFlow(false)
    private val _errorMessage = MutableStateFlow<String?>(null)

    private val core = combine(_step, _name, repository.categories, repository.anchors) { step, name, categories, anchors ->
        SetupCore(step, name, categories, anchors)
    }

    val uiState: StateFlow<SetupUiState> = combine(core, _isFinishing, _errorMessage) { c, finishing, error ->
        SetupUiState(c.step, c.name, c.categories, c.anchors, finishing, error)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SetupUiState())

    init {
        // A returning user redoing setup (web's "Redo the full setup wizard"
        // equivalent) already has a name -- seed the field so Skip/Finish
        // can't blank it out. A genuinely new account has name == "".
        viewModelScope.launch {
            repository.profile.first()?.name?.let { existing ->
                if (existing.isNotBlank()) _name.value = existing
            }
        }
    }

    fun setName(value: String) {
        _name.value = value
    }

    fun nextStep() {
        _step.value = (_step.value + 1).coerceAtMost(3)
    }

    fun backStep() {
        _step.value = (_step.value - 1).coerceAtLeast(0)
    }

    fun addItem(name: String, trackingMode: String, weeklyTarget: Double?, priorityTier: Int, weekendPreferred: Boolean) {
        if (name.isBlank()) return
        viewModelScope.launch {
            val result = repository.createCategory(name.trim(), trackingMode, weeklyTarget, priorityTier, weekendPreferred)
            _errorMessage.value = (result as? ApiResult.Failure)?.message
        }
    }

    fun removeItem(id: String) {
        viewModelScope.launch { repository.deleteCategory(id) }
    }

    fun addAnchor(body: AnchorCreateDto) {
        viewModelScope.launch {
            val result = repository.createAnchor(body)
            _errorMessage.value = (result as? ApiResult.Failure)?.message
        }
    }

    fun removeAnchor(id: String) {
        viewModelScope.launch { repository.deleteAnchor(id) }
    }

    fun finish() {
        completeOnboarding(_name.value.trim().ifBlank { "there" })
    }

    /** Mirrors the (fixed) web skipSetup: only invents a placeholder name
     * for a genuinely blank profile -- never clobbers a name the user (or
     * a previous setup pass) already entered. */
    fun skip() {
        completeOnboarding(_name.value.trim().ifBlank { RANDOM_NAMES.random() })
    }

    private fun completeOnboarding(name: String) {
        viewModelScope.launch {
            _isFinishing.value = true
            val result = repository.updateProfile(UserUpdateDto(name = name, onboarded = true))
            _errorMessage.value = (result as? ApiResult.Failure)?.message
            _isFinishing.value = false
        }
    }
}
