package com.cadence.app.ui.timer

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.lifecycle.viewmodel.initializer
import com.cadence.app.data.CadenceRepository
import com.cadence.app.ui.components.CadenceGhostButton
import com.cadence.app.ui.components.CadenceOutlinedButton
import com.cadence.app.ui.components.CadencePrimaryButton
import com.cadence.app.ui.theme.CadenceShapes
import com.cadence.app.ui.theme.CadenceThemeTokens

@Composable
fun TimerScreen(repository: CadenceRepository) {
    val viewModel: TimerViewModel = viewModel(
        factory = viewModelFactory { initializer { TimerViewModel(repository) } },
    )
    val state by viewModel.state.collectAsState()
    val colors = CadenceThemeTokens.colors

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Timer", style = MaterialTheme.typography.headlineSmall, color = colors.inkBlack)

        if (state.categories.isEmpty()) {
            Text("No items yet -- add some from the web app's Settings.", color = colors.stone)
            return@Column
        }

        Text("Item", style = MaterialTheme.typography.bodySmall, color = colors.stone)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.categories) { category ->
                FilterChip(
                    selected = category.id == state.selectedCategoryId,
                    onClick = { viewModel.selectCategory(category.id) },
                    label = { Text(category.name) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = colors.accent,
                        selectedLabelColor = colors.pureWhite,
                    ),
                )
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = CadenceShapes.card,
            colors = CardDefaults.cardColors(containerColor = colors.pureWhite),
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                val running = state.runState as? TimerRunState.Running
                Text(
                    text = formatElapsed(running?.elapsedSeconds ?: 0),
                    style = MaterialTheme.typography.displaySmall,
                    color = colors.inkBlack,
                )
                if (running == null) {
                    CadencePrimaryButton(text = "Start session", onClick = viewModel::startTimer)
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        CadencePrimaryButton(text = "Stop", onClick = viewModel::stopAndLog)
                        CadenceGhostButton(text = "Cancel", onClick = viewModel::cancelTimer)
                    }
                }
            }
        }

        ManualLogRow(onLog = viewModel::logManual)

        state.lastLoggedMessage?.let { message ->
            Text(message, color = colors.accent, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun ManualLogRow(onLog: (Int) -> Unit) {
    val colors = CadenceThemeTokens.colors
    var minutesText by remember { mutableStateOf("") }

    Column {
        Text("Or log manually", style = MaterialTheme.typography.bodySmall, color = colors.stone)
        Row(
            modifier = Modifier.padding(top = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = minutesText,
                onValueChange = { minutesText = it.filter(Char::isDigit) },
                label = { Text("Minutes") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
            )
            CadenceOutlinedButton(
                text = "Log",
                onClick = {
                    minutesText.toIntOrNull()?.let(onLog)
                    minutesText = ""
                },
            )
        }
    }
}

private fun formatElapsed(totalSeconds: Int): String {
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%02d:%02d".format(minutes, seconds)
}
