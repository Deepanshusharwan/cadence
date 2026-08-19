package com.cadence.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadence.app.data.CadenceRepository
import com.cadence.app.data.local.ThemePreferences
import com.cadence.app.network.ApiResult
import com.cadence.app.network.dto.AnchorCreateDto
import com.cadence.app.network.dto.AnchorDto
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.network.dto.CategoryUpdateDto
import com.cadence.app.network.dto.UserDto
import com.cadence.app.network.dto.UserUpdateDto
import com.clerk.api.Clerk
import com.clerk.api.network.serialization.errorMessage
import com.clerk.api.network.serialization.onFailure
import com.clerk.api.network.serialization.onSuccess
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val repository: CadenceRepository,
    private val themePreferences: ThemePreferences,
) : ViewModel() {
    val profile: StateFlow<UserDto?> =
        repository.profile.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val categories: StateFlow<List<CategoryDto>> =
        repository.categories.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val anchors: StateFlow<List<AnchorDto>> =
        repository.anchors.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val themeMode: StateFlow<String> =
        themePreferences.mode.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "light")

    private val _signOutError = MutableStateFlow<String?>(null)
    val signOutError: StateFlow<String?> = _signOutError.asStateFlow()

    private val _itemError = MutableStateFlow<String?>(null)
    val itemError: StateFlow<String?> = _itemError.asStateFlow()

    fun signOut() {
        viewModelScope.launch {
            Clerk.auth
                .signOut()
                .onSuccess { repository.signOutCleanup() }
                .onFailure { _signOutError.value = it.errorMessage }
        }
    }

    fun addItem(name: String, trackingMode: String, weeklyTarget: Double?, priorityTier: Int, weekendPreferred: Boolean) {
        if (name.isBlank()) return
        viewModelScope.launch {
            val result = repository.createCategory(name.trim(), trackingMode, weeklyTarget, priorityTier, weekendPreferred)
            _itemError.value = (result as? ApiResult.Failure)?.message
        }
    }

    fun updateItem(id: String, patch: CategoryUpdateDto) {
        viewModelScope.launch {
            val result = repository.updateCategory(id, patch)
            _itemError.value = (result as? ApiResult.Failure)?.message
        }
    }

    fun removeItem(id: String) {
        viewModelScope.launch {
            val result = repository.deleteCategory(id)
            _itemError.value = (result as? ApiResult.Failure)?.message
        }
    }

    fun dismissItemError() {
        _itemError.value = null
    }

    fun addAnchor(body: AnchorCreateDto) {
        viewModelScope.launch {
            val result = repository.createAnchor(body)
            _itemError.value = (result as? ApiResult.Failure)?.message
        }
    }

    fun removeAnchor(id: String) {
        viewModelScope.launch {
            val result = repository.deleteAnchor(id)
            _itemError.value = (result as? ApiResult.Failure)?.message
        }
    }

    /** Device-level, not synced -- see data/local/ThemePreferences.kt. */
    fun setThemeMode(mode: String) {
        viewModelScope.launch { themePreferences.setMode(mode) }
    }

    /** Per-account, synced via PATCH /me -- unlike appearance, this follows
     * the signed-in user to other devices, same as the web app. */
    fun setAccentColor(key: String) {
        viewModelScope.launch { repository.updateProfile(UserUpdateDto(accentColor = key)) }
    }
}
