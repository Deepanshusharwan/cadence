@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.cadence.app.ui.calendar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.cadence.app.data.CadenceRepository
import com.cadence.app.ui.components.CadenceCard
import com.cadence.app.ui.components.CadenceGhostButton
import com.cadence.app.ui.components.CadencePrimaryButton
import com.cadence.app.ui.theme.CadenceThemeTokens

@Composable
fun CalendarScreen(repository: CadenceRepository) {
    val viewModel: CalendarViewModel = viewModel(
        factory = viewModelFactory { initializer { CalendarViewModel(repository) } },
    )
    val state by viewModel.uiState.collectAsState()
    val colors = CadenceThemeTokens.colors
    var showAddEvent by remember { mutableStateOf(false) }

    PullToRefreshBox(isRefreshing = state.isRefreshing, onRefresh = viewModel::refresh) {
        LazyColumn(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { Text("Calendar", style = MaterialTheme.typography.headlineSmall, color = colors.inkBlack) }

            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(state.days) { day ->
                        FilterChip(
                            selected = day.date == state.selectedDate,
                            onClick = { viewModel.selectDay(day.date) },
                            label = { Text(if (day.isToday) "${day.label} •" else day.label) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = colors.accent,
                                selectedLabelColor = colors.pureWhite,
                            ),
                        )
                    }
                }
            }

            state.errorMessage?.let { message ->
                item {
                    CadenceCard(backgroundColor = colors.skyTint) {
                        Text("Couldn't refresh: $message", color = colors.accent)
                    }
                }
            }

            if (state.blocks.isEmpty() && !state.isRefreshing) {
                item {
                    CadenceCard { Text("Nothing scheduled this day.", color = colors.stone) }
                }
            }

            items(state.blocks) { block ->
                CadenceCard {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text(
                                block.label,
                                color = if (block.dim) colors.stone else colors.inkBlack,
                                fontWeight = if (block.dim) FontWeight.Normal else FontWeight.Medium,
                            )
                            Text(block.time, color = colors.stone, style = MaterialTheme.typography.bodySmall)
                        }
                        if (block.isEvent) {
                            Text("Event", color = colors.coral, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            item {
                if (showAddEvent) {
                    AddEventForm(
                        onCancel = { showAddEvent = false },
                        onSave = { title, start, end, type ->
                            viewModel.addEvent(title, start, end, type)
                            showAddEvent = false
                        },
                    )
                } else {
                    CadenceGhostButton(text = "+ Add event", onClick = { showAddEvent = true }, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

private val eventTypes = listOf("SCHOOL_OR_WORK", "SOCIAL", "PERSONAL", "TRAVEL", "OTHER")

@Composable
private fun AddEventForm(onCancel: () -> Unit, onSave: (title: String, start: String, end: String, type: String) -> Unit) {
    val colors = CadenceThemeTokens.colors
    var title by remember { mutableStateOf("") }
    var start by remember { mutableStateOf("") }
    var end by remember { mutableStateOf("") }
    var type by remember { mutableStateOf(eventTypes.first()) }

    CadenceCard {
        OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Event title") }, modifier = Modifier.fillMaxWidth())
        Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = start,
                onValueChange = { start = it },
                label = { Text("Start (HH:MM)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = end,
                onValueChange = { end = it },
                label = { Text("End (HH:MM)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
            )
        }
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(top = 8.dp),
        ) {
            items(eventTypes) { t ->
                FilterChip(
                    selected = type == t,
                    onClick = { type = t },
                    label = { Text(t.replace('_', ' ')) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = colors.accent, selectedLabelColor = colors.pureWhite),
                )
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
            CadencePrimaryButton(text = "Save", onClick = { onSave(title, start, end, type) }, enabled = title.isNotBlank() && start.isNotBlank() && end.isNotBlank())
            CadenceGhostButton(text = "Cancel", onClick = onCancel)
        }
    }
}
