package com.cadence.app.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.lifecycle.viewmodel.initializer
import com.cadence.app.data.CadenceRepository
import com.cadence.app.ui.components.CadenceCard
import com.cadence.app.ui.components.CadenceOutlinedButton
import com.cadence.app.ui.theme.CadenceThemeTokens

/** Deliberately minimal (see the mobile build plan's Phase 1 scope) --
 * profile display + sign out only. Editing categories/anchors/targets etc.
 * stays on the web app's Settings for now. */
@Composable
fun SettingsScreen(repository: CadenceRepository) {
    val viewModel: SettingsViewModel = viewModel(
        factory = viewModelFactory { initializer { SettingsViewModel(repository) } },
    )
    val profile by viewModel.profile.collectAsState()
    val signOutError by viewModel.signOutError.collectAsState()
    val colors = CadenceThemeTokens.colors

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Settings", style = MaterialTheme.typography.headlineSmall, color = colors.inkBlack)

        CadenceCard {
            Text(profile?.name?.ifBlank { "there" } ?: "…", color = colors.inkBlack, fontWeight = FontWeight.SemiBold)
            profile?.let { p ->
                Text(
                    "Plan: ${p.plan.replaceFirstChar(Char::uppercase)}",
                    color = colors.stone,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }

        signOutError?.let { message ->
            Text(message, color = colors.coral, style = MaterialTheme.typography.bodySmall)
        }

        CadenceOutlinedButton(text = "Sign out", onClick = viewModel::signOut)
    }
}
