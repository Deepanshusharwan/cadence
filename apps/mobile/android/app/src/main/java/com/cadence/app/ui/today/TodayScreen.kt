@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.cadence.app.ui.today

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.lifecycle.viewmodel.initializer
import com.cadence.app.data.CadenceRepository
import com.cadence.app.ui.components.CadenceCard
import com.cadence.app.ui.theme.CadenceThemeTokens

@Composable
fun TodayScreen(repository: CadenceRepository) {
    val viewModel: TodayViewModel = viewModel(
        factory = viewModelFactory { initializer { TodayViewModel(repository) } },
    )
    val state by viewModel.uiState.collectAsState()
    val colors = CadenceThemeTokens.colors

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
                    }
                }
            }

            state.errorMessage?.let { message ->
                item {
                    CadenceCard(backgroundColor = colors.skyTint) {
                        Text("Couldn't refresh: $message", color = colors.notionBlue)
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

            if (state.progress.isNotEmpty()) {
                item {
                    Text(
                        "This week",
                        style = MaterialTheme.typography.titleMedium,
                        color = colors.inkBlack,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
                items(state.progress) { progress -> CategoryProgressRow(progress) }
            }
        }
    }
}

/** Mirrors apps/web/src/app/dashboard/page.tsx's `CategoryProgress` exactly:
 * every item shows a bar, not just ones with a weekly target. A no-target
 * item falls back to its own previous week's total as the reference point
 * (spec has no "minimum" to compare against) instead of a permanently-empty
 * bar -- fixed on web in "Fix no-target categories showing frozen No
 * minimum instead of logged progress", ported here for the same behavior. */
@Composable
private fun CategoryProgressRow(progress: CategoryProgress) {
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

    CadenceCard {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(category.name, color = colors.inkBlack, fontWeight = FontWeight.Medium)
            Text(label + lastWeekLabel, color = colors.stone, style = MaterialTheme.typography.bodySmall)
        }
        LinearProgressIndicator(
            progress = { fraction.toFloat() },
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
            color = colors.notionBlue,
            trackColor = colors.skyTint,
        )
    }
}
