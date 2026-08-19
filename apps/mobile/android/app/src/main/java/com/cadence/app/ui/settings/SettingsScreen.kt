package com.cadence.app.ui.settings

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.cadence.app.data.CadenceRepository
import com.cadence.app.data.local.ThemePreferences
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.ui.components.CadenceCard
import com.cadence.app.ui.components.CadenceGhostButton
import com.cadence.app.ui.components.CadenceOutlinedButton
import com.cadence.app.ui.components.CadencePrimaryButton
import com.cadence.app.ui.theme.ACCENT_OPTIONS
import com.cadence.app.ui.theme.CadenceThemeTokens

/** Profile + item (category) management + theme (Plus) + sign out.
 * Anchors/schedule editing and some account-level settings (wake window,
 * leave allowance) stay on the web app for now -- see the mobile build
 * plan's deferred list. */
@Composable
fun SettingsScreen(repository: CadenceRepository, themePreferences: ThemePreferences) {
    val viewModel: SettingsViewModel = viewModel(
        factory = viewModelFactory { initializer { SettingsViewModel(repository, themePreferences) } },
    )
    val profile by viewModel.profile.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val themeMode by viewModel.themeMode.collectAsState()
    val signOutError by viewModel.signOutError.collectAsState()
    val itemError by viewModel.itemError.collectAsState()
    val colors = CadenceThemeTokens.colors
    var showAddItem by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
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

        ThemeSection(
            isPlus = profile?.plan != null && profile?.plan != "free",
            themeMode = themeMode,
            accentColorKey = profile?.accentColor,
            onSetThemeMode = viewModel::setThemeMode,
            onSetAccentColor = viewModel::setAccentColor,
        )

        Text("Items", style = MaterialTheme.typography.titleMedium, color = colors.inkBlack)

        itemError?.let { message ->
            CadenceCard(backgroundColor = colors.skyTint) {
                Text(message, color = colors.accent, style = MaterialTheme.typography.bodySmall)
            }
        }

        categories.forEach { category ->
            ItemRow(category = category, onRemove = { viewModel.removeItem(category.id) })
        }

        if (showAddItem) {
            AddItemForm(
                onCancel = { showAddItem = false },
                onSave = { name, mode, target, tier, weekend ->
                    viewModel.addItem(name, mode, target, tier, weekend)
                    showAddItem = false
                },
            )
        } else {
            CadenceGhostButton(text = "+ Add item", onClick = { showAddItem = true }, modifier = Modifier.fillMaxWidth())
        }

        signOutError?.let { message ->
            Text(message, color = colors.coral, style = MaterialTheme.typography.bodySmall)
        }

        CadenceOutlinedButton(text = "Sign out", onClick = viewModel::signOut)
    }
}

/** Mirrors apps/web/src/app/dashboard/settings/page.tsx's Plus-gated Theme
 * section exactly: Appearance (light/dark/system, a device-level pick, see
 * data/local/ThemePreferences.kt) + Accent color (per-account, synced via
 * PATCH /me, see ui/theme/Color.kt's ACCENT_OPTIONS). */
@Composable
private fun ThemeSection(
    isPlus: Boolean,
    themeMode: String,
    accentColorKey: String?,
    onSetThemeMode: (String) -> Unit,
    onSetAccentColor: (String) -> Unit,
) {
    val colors = CadenceThemeTokens.colors

    CadenceCard {
        Text(
            "THEME",
            color = colors.stone,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Medium,
        )

        if (!isPlus) {
            Text(
                "Switch to dark mode and pick an accent color that's yours — upgrade to Plus to unlock this.",
                color = colors.stone,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 4.dp),
            )
        } else {
            Text("Appearance", color = colors.inkBlack, fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 6.dp)) {
                listOf("light", "dark", "system").forEach { mode ->
                    FilterChip(
                        selected = themeMode == mode,
                        onClick = { onSetThemeMode(mode) },
                        label = { Text(mode.replaceFirstChar(Char::uppercase)) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = colors.accent,
                            selectedLabelColor = colors.pureWhite,
                        ),
                    )
                }
            }

            Text("Accent color", color = colors.inkBlack, fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 8.dp)) {
                ACCENT_OPTIONS.forEach { option ->
                    val selected = (accentColorKey ?: "notion-blue") == option.key
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .then(
                                if (selected) {
                                    Modifier.border(2.dp, colors.inkBlack.copy(alpha = 0.6f), CircleShape).padding(3.dp)
                                } else {
                                    Modifier.padding(1.dp)
                                },
                            )
                            .clip(CircleShape)
                            .clickable { onSetAccentColor(option.key) },
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            drawCircle(color = option.color)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ItemRow(category: CategoryDto, onRemove: () -> Unit) {
    val colors = CadenceThemeTokens.colors
    CadenceCard {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(category.name, color = colors.inkBlack, fontWeight = FontWeight.Medium)
                val targetLabel = category.weeklyTarget?.let {
                    if (category.trackingMode == "hours") "${it.toInt()}h/week" else "${it.toInt()} sessions/week"
                } ?: "No minimum"
                Text("$targetLabel · Tier ${category.priorityTier}", color = colors.stone, style = MaterialTheme.typography.bodySmall)
            }
            Text(
                "Remove",
                color = colors.coral,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier
                    .padding(start = 8.dp)
                    .clickable(onClick = onRemove),
            )
        }
    }
}

@Composable
private fun AddItemForm(
    onCancel: () -> Unit,
    onSave: (name: String, trackingMode: String, weeklyTarget: Double?, priorityTier: Int, weekendPreferred: Boolean) -> Unit,
) {
    val colors = CadenceThemeTokens.colors
    var name by remember { mutableStateOf("") }
    var trackingMode by remember { mutableStateOf("hours") }
    var targetText by remember { mutableStateOf("") }
    var tier by remember { mutableStateOf(1) }
    var weekendPreferred by remember { mutableStateOf(false) }

    CadenceCard {
        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("Item name — e.g. Guitar") },
            modifier = Modifier.fillMaxWidth(),
        )

        Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = trackingMode == "hours",
                onClick = { trackingMode = "hours" },
                label = { Text("Hours") },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = colors.accent, selectedLabelColor = colors.pureWhite),
            )
            FilterChip(
                selected = trackingMode == "sessions",
                onClick = { trackingMode = "sessions" },
                label = { Text("Sessions") },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = colors.accent, selectedLabelColor = colors.pureWhite),
            )
        }

        OutlinedTextField(
            value = targetText,
            onValueChange = { targetText = it.filter(Char::isDigit) },
            label = { Text("Weekly target (blank = no minimum)") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        )

        Text("Priority tier", style = MaterialTheme.typography.bodySmall, color = colors.stone, modifier = Modifier.padding(top = 8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            (1..5).forEach { t ->
                FilterChip(
                    selected = tier == t,
                    onClick = { tier = t },
                    label = { Text("$t") },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = colors.accent, selectedLabelColor = colors.pureWhite),
                )
            }
        }

        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
            Checkbox(checked = weekendPreferred, onCheckedChange = { weekendPreferred = it })
            Text("Weekend-preferred", color = colors.inkBlack, style = MaterialTheme.typography.bodySmall)
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
            CadencePrimaryButton(
                text = "Save",
                onClick = { onSave(name, trackingMode, targetText.toDoubleOrNull(), tier, weekendPreferred) },
                enabled = name.isNotBlank(),
            )
            CadenceGhostButton(text = "Cancel", onClick = onCancel)
        }
    }
}
