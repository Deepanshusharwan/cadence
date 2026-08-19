package com.cadence.app.ui.review

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.cadence.app.data.CadenceRepository
import com.cadence.app.ui.components.CadencePrimaryButton
import com.cadence.app.ui.theme.CadenceThemeTokens

/** Weekly Review (spec §52) -- wins/problems/next-week-changes for the
 * current week, same three fields as the web app's review page. */
@Composable
fun ReviewScreen(repository: CadenceRepository) {
    val viewModel: ReviewViewModel = viewModel(
        factory = viewModelFactory { initializer { ReviewViewModel(repository) } },
    )
    val state by viewModel.uiState.collectAsState()
    val colors = CadenceThemeTokens.colors

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Weekly review", style = MaterialTheme.typography.headlineSmall, color = colors.inkBlack)
        Text("Week of ${state.weekStart}", color = colors.stone, style = MaterialTheme.typography.bodySmall)

        state.errorMessage?.let { message ->
            Text(message, color = colors.coral, style = MaterialTheme.typography.bodySmall)
        }

        ReviewField(label = "What went well?", value = state.wins, onValueChange = viewModel::updateWins)
        ReviewField(label = "What got in the way?", value = state.problems, onValueChange = viewModel::updateProblems)
        ReviewField(
            label = "What should change next week?",
            value = state.nextWeekChanges,
            onValueChange = viewModel::updateNextWeekChanges,
        )

        CadencePrimaryButton(
            text = if (state.isSaving) "Saving…" else "Save",
            onClick = viewModel::save,
            enabled = !state.isSaving,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun ReviewField(label: String, value: String, onValueChange: (String) -> Unit) {
    val colors = CadenceThemeTokens.colors
    Column {
        Text(label, color = colors.stone, style = MaterialTheme.typography.bodySmall)
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth().height(100.dp).padding(top = 4.dp),
        )
    }
}
