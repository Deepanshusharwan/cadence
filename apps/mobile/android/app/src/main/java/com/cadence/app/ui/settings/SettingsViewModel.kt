package com.cadence.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadence.app.data.CadenceRepository
import com.cadence.app.network.dto.UserDto
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

class SettingsViewModel(private val repository: CadenceRepository) : ViewModel() {
    val profile: StateFlow<UserDto?> =
        repository.profile.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    private val _signOutError = MutableStateFlow<String?>(null)
    val signOutError: StateFlow<String?> = _signOutError.asStateFlow()

    fun signOut() {
        viewModelScope.launch {
            Clerk.auth
                .signOut()
                .onSuccess { repository.signOutCleanup() }
                .onFailure { _signOutError.value = it.errorMessage }
        }
    }
}
