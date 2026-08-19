@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.cadence.app.ui.progress

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.cadence.app.data.CadenceRepository
import com.cadence.app.ui.components.CadenceCard
import com.cadence.app.ui.components.CadenceGhostButton
import com.cadence.app.ui.theme.CadenceThemeTokens

@Composable
fun ProgressScreen(repository: CadenceRepository, onOpenReview: () -> Unit) {
    val viewModel: ProgressViewModel = viewModel(
        factory = viewModelFactory { initializer { ProgressViewModel(repository) } },
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
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Progress", style = MaterialTheme.typography.headlineSmall, color = colors.inkBlack)
                    CadenceGhostButton(text = "Weekly review", onClick = onOpenReview)
                }
            }

            state.streaks?.let { streaks ->
                item {
                    CadenceCard {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            StreakStat(label = "Current streak", value = "${streaks.current.length}")
                            StreakStat(label = "Longest streak", value = "${streaks.longest.length}")
                        }
                    }
                }
            }

            if (state.weekly.isNotEmpty()) {
                item {
                    Text("This week", style = MaterialTheme.typography.titleMedium, color = colors.inkBlack)
                }
                items(state.weekly) { item -> WeeklyItemRow(item) }
            }

            if (state.insights.isNotEmpty()) {
                item {
                    Text(
                        "Insights",
                        style = MaterialTheme.typography.titleMedium,
                        color = colors.inkBlack,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
                items(state.insights) { insight ->
                    CadenceCard { Text(insight.text, color = colors.inkBlack) }
                }
            }

            if (state.isPlus) {
                state.longTermTrend?.monthlyConsistencyPct?.let { months ->
                    if (months.isNotEmpty()) {
                        item {
                            Text(
                                "Long-term consistency",
                                style = MaterialTheme.typography.titleMedium,
                                color = colors.inkBlack,
                                modifier = Modifier.padding(top = 8.dp),
                            )
                        }
                        items(months) { month ->
                            CadenceCard {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(month.month, color = colors.inkBlack)
                                    Text("${month.pct}%", color = colors.stone)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StreakStat(label: String, value: String) {
    val colors = CadenceThemeTokens.colors
    Column {
        Text(value, color = colors.inkBlack, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
        Text(label, color = colors.stone, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun WeeklyItemRow(item: WeeklyItemProgress) {
    val colors = CadenceThemeTokens.colors
    val isHourBased = item.category.trackingMode == "hours"
    val label = if (isHourBased) {
        "${"%.1f".format(item.weeklyMinutes / 60.0)}h"
    } else {
        "${item.weeklySessionCount} sessions"
    }
    CadenceCard {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(item.category.name, color = colors.inkBlack, fontWeight = FontWeight.Medium)
            Text(label, color = colors.stone, style = MaterialTheme.typography.bodySmall)
        }
    }
}
