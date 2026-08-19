package com.cadence.app.ui.timer

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.lifecycle.viewmodel.initializer
import com.cadence.app.data.CadenceRepository
import com.cadence.app.data.local.ThemePreferences
import com.cadence.app.ui.components.CadenceGhostButton
import com.cadence.app.ui.components.CadenceOutlinedButton
import com.cadence.app.ui.components.CadencePrimaryButton
import com.cadence.app.ui.theme.CadenceShapes
import com.cadence.app.ui.theme.CadenceThemeTokens

@Composable
fun TimerScreen(repository: CadenceRepository, themePreferences: ThemePreferences) {
    val viewModel: TimerViewModel = viewModel(
        factory = viewModelFactory { initializer { TimerViewModel(repository, themePreferences) } },
    )
    val state by viewModel.state.collectAsState()
    val colors = CadenceThemeTokens.colors
    val running = state.runState as? TimerRunState.Running
    val activeFace = if (state.isPlus) state.watchFace else "chronograph"
    val itemLabel = state.categories.firstOrNull { it.id == state.selectedCategoryId }?.name ?: "session"

    // Opens fullscreen the moment a session starts (rather than web's
    // opt-in-only fullscreen button) -- on a phone the running timer is the
    // point of the screen, so it should take over immediately; minimizing
    // is still one tap away via the overlay's own close affordance.
    var isFullscreen by androidx.compose.runtime.remember { mutableStateOf(false) }
    androidx.compose.runtime.LaunchedEffect(running != null) {
        if (running != null) isFullscreen = true
    }
    if (isFullscreen && running != null) {
        TimerFullscreenOverlay(
            activeFace = activeFace,
            elapsedSeconds = running.elapsedSeconds,
            itemLabel = itemLabel,
            isPlus = state.isPlus,
            onSwipe = { delta -> viewModel.setWatchFace(cycleWatchFace(activeFace, delta)) },
            onStop = { viewModel.stopAndLog() },
            onCancel = { viewModel.cancelTimer() },
            onMinimize = { isFullscreen = false },
        )
    }

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
                    leadingIcon = { com.cadence.app.ui.components.CategoryDot(category.color) },
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
                WatchFace(
                    key = activeFace,
                    elapsedSeconds = running?.elapsedSeconds ?: 0,
                    running = running != null,
                    itemLabel = itemLabel,
                    size = 200.dp,
                    onSwipeNext = if (state.isPlus) { { viewModel.setWatchFace(cycleWatchFace(activeFace, 1)) } } else null,
                    onSwipePrevious = if (state.isPlus) { { viewModel.setWatchFace(cycleWatchFace(activeFace, -1)) } } else null,
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

        WatchFacePicker(isPlus = state.isPlus, selectedKey = activeFace, onSelect = viewModel::setWatchFace)

        ManualLogRow(onLog = viewModel::logManual)

        com.cadence.app.ui.components.ToastEffect(state.lastLoggedMessage, viewModel::dismissMessage)
    }
}

/** Mirrors the web dashboard's watch-face picker: a row of dots (filled =
 * accent) + prev/next chevrons + the current face's label. Free accounts
 * see the same row but locked to chronograph, with an upsell line instead
 * of working chevrons -- same "show it, don't let a free user hit a 403"
 * pattern as ui/settings/SettingsScreen.kt's ThemeSection. */
@Composable
private fun WatchFacePicker(isPlus: Boolean, selectedKey: String, onSelect: (String) -> Unit) {
    val colors = CadenceThemeTokens.colors
    val index = WATCH_FACE_OPTIONS.indexOfFirst { it.key == selectedKey }.coerceAtLeast(0)

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        if (!isPlus) {
            Text(
                "Upgrade to Plus to unlock 7 more watch faces.",
                color = colors.stone,
                style = MaterialTheme.typography.bodySmall,
            )
        } else {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "‹",
                    color = colors.inkBlack,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.clickable { onSelect(cycleWatchFace(selectedKey, -1)) },
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    WATCH_FACE_OPTIONS.forEachIndexed { i, _ ->
                        val dotColor = if (i == index) colors.accent else colors.inkBlack.copy(alpha = 0.15f)
                        Box(modifier = Modifier.size(7.dp).clip(CircleShape).then(Modifier.padding(0.dp))) {
                            Canvas(Modifier.size(7.dp)) { drawCircle(dotColor) }
                        }
                    }
                }
                Text(
                    "›",
                    color = colors.inkBlack,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.clickable { onSelect(cycleWatchFace(selectedKey, 1)) },
                )
            }
            Text(
                WATCH_FACE_OPTIONS[index].label,
                color = colors.stone,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

/** Opens automatically the moment a session starts (see TimerScreen's
 * LaunchedEffect) -- a real Dialog window rather than an in-tree overlay so
 * it draws over the bottom nav bar too, matching a "this is now the whole
 * screen" fullscreen timer. Swipe left/right on the face to switch watch
 * faces (Plus only); the × minimizes back to the normal Timer tab without
 * stopping the session. */
@Composable
private fun TimerFullscreenOverlay(
    activeFace: String,
    elapsedSeconds: Int,
    itemLabel: String,
    isPlus: Boolean,
    onSwipe: (Int) -> Unit,
    onStop: () -> Unit,
    onCancel: () -> Unit,
    onMinimize: () -> Unit,
) {
    val colors = CadenceThemeTokens.colors
    androidx.compose.ui.window.Dialog(
        onDismissRequest = onMinimize,
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Box(
            modifier = Modifier.fillMaxSize().background(colors.paperWarmth),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "×",
                color = colors.stone,
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(24.dp)
                    .clickable(onClick = onMinimize),
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(24.dp)) {
                WatchFace(
                    key = activeFace,
                    elapsedSeconds = elapsedSeconds,
                    running = true,
                    itemLabel = itemLabel,
                    size = 300.dp,
                    onSwipeNext = if (isPlus) { { onSwipe(1) } } else null,
                    onSwipePrevious = if (isPlus) { { onSwipe(-1) } } else null,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    CadencePrimaryButton(text = "Stop", onClick = onStop)
                    CadenceGhostButton(text = "Cancel", onClick = onCancel)
                }
            }
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
