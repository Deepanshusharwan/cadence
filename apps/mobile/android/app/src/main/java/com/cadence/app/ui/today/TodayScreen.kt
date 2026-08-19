@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.cadence.app.ui.today

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.lifecycle.viewmodel.initializer
import com.cadence.app.R
import com.cadence.app.data.CadenceRepository
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.ui.components.CadenceCard
import com.cadence.app.ui.components.CadencePrimaryButton
import com.cadence.app.ui.components.CategoryDot
import com.cadence.app.ui.components.EmptyStateIllustration
import com.cadence.app.ui.components.ToastEffect
import com.cadence.app.ui.theme.CadenceThemeTokens

@Composable
fun TodayScreen(repository: CadenceRepository, onOpenTimer: () -> Unit) {
    val viewModel: TodayViewModel = viewModel(
        factory = viewModelFactory { initializer { TodayViewModel(repository) } },
    )
    val state by viewModel.uiState.collectAsState()
    val colors = CadenceThemeTokens.colors
    var actionTarget by remember { mutableStateOf<CategoryDto?>(null) }

    ToastEffect(state.errorMessage) { viewModel.dismissError() }
    ToastEffect(state.lastLoggedMessage) { viewModel.dismissMessage() }

    actionTarget?.let { category ->
        LogOrTimerDialog(
            category = category,
            onDismiss = { actionTarget = null },
            onOpenTimer = {
                viewModel.openTimerFor(category.id)
                actionTarget = null
                onOpenTimer()
            },
            onLog = { minutes ->
                viewModel.logManual(category.id, minutes)
                actionTarget = null
            },
        )
    }

    PullToRefreshBox(isRefreshing = state.isRefreshing, onRefresh = viewModel::refresh) {
        LazyColumn(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text("Today", style = MaterialTheme.typography.headlineSmall, color = colors.inkBlack)
                val withTarget = state.progress.filter { it.category.weeklyTarget != null }
                if (withTarget.isNotEmpty()) {
                    val onTrack = withTarget.count { it.isOnTrack }
                    Text(
                        "$onTrack/${withTarget.size} on track this week",
                        color = if (onTrack == withTarget.size) colors.signalBlue else colors.stone,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }

            state.leaveBalance?.let { leave ->
                item {
                    CadenceCard {
                        Text("Leave balance", color = colors.stone, style = MaterialTheme.typography.bodyMedium)
                        Text(
                            "${leave.remaining} units remaining",
                            color = colors.inkBlack,
                            fontWeight = FontWeight.SemiBold,
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.padding(top = 8.dp),
                        ) {
                            DayTypeChip(
                                label = "Reduced day",
                                selected = state.todayDayType == "REDUCED",
                                onClick = { viewModel.markToday("REDUCED") },
                            )
                            DayTypeChip(
                                label = "Full leave",
                                selected = state.todayDayType == "LEAVE",
                                onClick = { viewModel.markToday("LEAVE") },
                            )
                        }
                    }
                }
            }

            if (state.schedule.isEmpty() && !state.isRefreshing) {
                item {
                    CadenceCard {
                        Text("Nothing scheduled yet -- add anchors from the web app's Settings.", color = colors.stone)
                    }
                }
            }

            items(state.schedule) { block ->
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
                Text(
                    "This week",
                    style = MaterialTheme.typography.titleMedium,
                    color = colors.inkBlack,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            if (state.progress.isEmpty()) {
                item {
                    CadenceCard {
                        EmptyStateIllustration(
                            drawableRes = R.drawable.illustration_empty_categories,
                            title = "No items yet",
                            subtitle = "Add your first item from Settings to start organizing your week around it.",
                        )
                    }
                }
            } else {
                items(state.progress) { progress ->
                    CategoryProgressRow(progress, onClick = { actionTarget = progress.category })
                }
            }
        }
    }
}

/** One of the two offline-critical actions (docs/architecture.md §4) --
 * "mark a day reduced/leave" -- tapping the already-selected chip clears
 * back to NORMAL (see TodayViewModel.markToday). */
@Composable
private fun DayTypeChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val colors = CadenceThemeTokens.colors
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = colors.accent,
            selectedLabelColor = colors.pureWhite,
        ),
    )
}

/** Mirrors apps/web/src/app/dashboard/page.tsx's `CategoryProgress` exactly:
 * every item shows a bar, not just ones with a weekly target. A no-target
 * item falls back to its own previous week's total as the reference point
 * (spec has no "minimum" to compare against) instead of a permanently-empty
 * bar -- fixed on web in "Fix no-target categories showing frozen No
 * minimum instead of logged progress", ported here for the same behavior. */
@Composable
private fun CategoryProgressRow(progress: CategoryProgress, onClick: () -> Unit) {
    val colors = CadenceThemeTokens.colors
    val category = progress.category
    val target = category.weeklyTarget
    val hasTarget = target != null
    val isHourBased = category.trackingMode == "hours"
    val current = if (isHourBased) progress.weeklyMinutes / 60.0 else progress.weeklySessionCount.toDouble()
    val previous = if (isHourBased) progress.previousWeeklyMinutes / 60.0 else progress.previousWeeklySessionCount.toDouble()

    val fraction = when {
        target != null && target > 0 -> (current / target).coerceIn(0.0, 1.0)
        !hasTarget && previous > 0 -> (current / previous).coerceIn(0.0, 1.0)
        !hasTarget && current > 0 -> 1.0
        else -> 0.0
    }

    val label = if (isHourBased) {
        "${"%.1f".format(current)}h" + (target?.let { " / ${"%.0f".format(it)}h" } ?: "")
    } else {
        "${progress.weeklySessionCount}" + (target?.let { " / ${it.toInt()} sessions" } ?: " sessions")
    }
    val lastWeekLabel = if (!hasTarget && previous > 0) {
        if (isHourBased) " · ${"%.1f".format(previous)}h last week" else " · ${previous.toInt()} last week"
    } else {
        ""
    }

    CadenceCard(modifier = Modifier.clickable(onClick = onClick)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                CategoryDot(category.color)
                Text(category.name, color = colors.inkBlack, fontWeight = FontWeight.Medium)
            }
            Text(label + lastWeekLabel, color = colors.stone, style = MaterialTheme.typography.bodySmall)
        }
        LinearProgressIndicator(
            progress = { fraction.toFloat() },
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
            color = colors.accent,
            trackColor = colors.skyTint,
        )
    }
}

/** Tapping a "This week" row offers the same two actions the web dashboard's
 * category chips do (see apps/web/src/app/dashboard/page.tsx's
 * `timerMode === "timer" ? startTimerFor : setPendingManualLog`): jump to
 * the Timer tab with this item pre-selected, or log minutes right here. */
@Composable
private fun LogOrTimerDialog(category: CategoryDto, onDismiss: () -> Unit, onOpenTimer: () -> Unit, onLog: (Int) -> Unit) {
    val colors = CadenceThemeTokens.colors
    var minutesText by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(category.name, color = colors.inkBlack) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                CadencePrimaryButton(text = "Start timer", onClick = onOpenTimer, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = minutesText,
                        onValueChange = { minutesText = it.filter(Char::isDigit) },
                        label = { Text("Minutes") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = { minutesText.toIntOrNull()?.let(onLog) }) { Text("Log") }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
