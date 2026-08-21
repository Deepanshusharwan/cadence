package com.cadence.app.ui.settings

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.cadence.app.data.CadenceRepository
import com.cadence.app.data.local.ThemePreferences
import com.cadence.app.network.dto.AnchorDto
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.ui.components.AnchorForm
import com.cadence.app.ui.components.CadenceCard
import com.cadence.app.ui.components.CadenceGhostButton
import com.cadence.app.ui.components.CadenceOutlinedButton
import com.cadence.app.ui.components.CadencePrimaryButton
import com.cadence.app.ui.components.CategoryDot
import com.cadence.app.ui.components.ItemForm
import com.cadence.app.ui.components.MARK_OPTIONS
import com.cadence.app.ui.components.MarkAvatar
import com.cadence.app.ui.components.PRO_MARK_OPTIONS
import com.cadence.app.ui.theme.ACCENT_OPTIONS
import com.cadence.app.ui.theme.CadenceThemeTokens

private val WEEKDAY_LETTERS = mapOf(1 to "M", 2 to "T", 3 to "W", 4 to "T", 5 to "F", 6 to "S", 0 to "S")

private fun describeRecurrence(anchor: AnchorDto): String = when (anchor.recurrence) {
    "once" -> anchor.date ?: "one-off"
    "weekly" -> anchor.daysOfWeek.mapNotNull { WEEKDAY_LETTERS[it] }.joinToString("").ifEmpty { "weekly" }
    else -> "every day"
}

/** Profile (name + avatar) + item (category) + schedule (anchor) management
 * + theme (Plus) + account (timezone/notifications/leave/wake window) +
 * sign out. */
@Composable
fun SettingsScreen(repository: CadenceRepository, themePreferences: ThemePreferences) {
    val viewModel: SettingsViewModel = viewModel(
        factory = viewModelFactory { initializer { SettingsViewModel(repository, themePreferences) } },
    )
    val profile by viewModel.profile.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val anchors by viewModel.anchors.collectAsState()
    val themeMode by viewModel.themeMode.collectAsState()
    val signOutError by viewModel.signOutError.collectAsState()
    val itemError by viewModel.itemError.collectAsState()
    val hasAnyPendingWork by viewModel.hasAnyPendingWork.collectAsState()
    val colors = CadenceThemeTokens.colors
    var showAddItem by remember { mutableStateOf(false) }
    var showAddAnchor by remember { mutableStateOf(false) }
    var showSignOutConfirm by remember { mutableStateOf(false) }
    var isEditingProfile by remember { mutableStateOf(false) }
    var nameDraft by remember { mutableStateOf("") }
    var avatarDraft by remember { mutableStateOf("cat") }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Settings", style = MaterialTheme.typography.headlineSmall, color = colors.inkBlack)

        CadenceCard {
            val isPlus = profile?.plan != null && profile?.plan != "free"
            if (!isEditingProfile) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MarkAvatar(key = profile?.avatar, size = 44.dp)
                    Column(modifier = Modifier.weight(1f)) {
                        Text(profile?.name?.ifBlank { "there" } ?: "…", color = colors.inkBlack, fontWeight = FontWeight.SemiBold)
                        profile?.let { p ->
                            Text(
                                "Plan: ${p.plan.replaceFirstChar(Char::uppercase)}",
                                color = colors.stone,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                    Text(
                        "Edit",
                        color = colors.accent,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.clickable {
                            nameDraft = profile?.name.orEmpty()
                            avatarDraft = profile?.avatar ?: "cat"
                            isEditingProfile = true
                        },
                    )
                }
            } else {
                OutlinedTextField(value = nameDraft, onValueChange = { nameDraft = it }, modifier = Modifier.fillMaxWidth())

                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.padding(top = 12.dp),
                ) {
                    MARK_OPTIONS.forEach { (key, _) -> AvatarPickerDot(key, avatarDraft) { avatarDraft = key } }
                }

                if (isPlus) {
                    Text(
                        "Plus avatars",
                        color = colors.accent,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(top = 12.dp),
                    )
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(top = 6.dp),
                    ) {
                        PRO_MARK_OPTIONS.forEach { (key, _) -> AvatarPickerDot(key, avatarDraft) { avatarDraft = key } }
                    }
                } else {
                    Text(
                        "Upgrade to Plus to unlock 24 more avatars.",
                        color = colors.stone,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 12.dp),
                    )
                }

                CadencePrimaryButton(
                    text = "Done",
                    onClick = {
                        viewModel.saveProfile(nameDraft, avatarDraft)
                        isEditingProfile = false
                    },
                    modifier = Modifier.padding(top = 12.dp),
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

        profile?.let { p ->
            TimezoneNotificationsSection(
                timezone = p.timezone,
                notificationsEnabled = p.notificationsEnabled,
                onSetTimezone = { tz -> viewModel.saveAccount(tz, p.wakeStart, p.wakeEnd, p.leaveMonthlyAllowance, p.leaveCarryCap) },
                onSetNotificationsEnabled = viewModel::setNotificationsEnabled,
            )
        }

        Text("Items", style = MaterialTheme.typography.titleMedium, color = colors.inkBlack)

        com.cadence.app.ui.components.ToastEffect(itemError, viewModel::dismissItemError)

        categories.forEach { category ->
            ItemRow(category = category, onRemove = { viewModel.removeItem(category.id) })
        }

        if (showAddItem) {
            ItemForm(
                onCancel = { showAddItem = false },
                onSave = { name, mode, target, tier, weekend ->
                    viewModel.addItem(name, mode, target, tier, weekend)
                    showAddItem = false
                },
            )
        } else {
            CadenceGhostButton(text = "+ Add item", onClick = { showAddItem = true }, modifier = Modifier.fillMaxWidth())
        }

        Text("Schedule", style = MaterialTheme.typography.titleMedium, color = colors.inkBlack)

        if (anchors.isEmpty()) {
            CadenceCard { Text("No fixed times yet.", color = colors.stone) }
        }

        anchors.forEach { anchor ->
            AnchorRow(anchor = anchor, onRemove = { viewModel.removeAnchor(anchor.id) })
        }

        if (showAddAnchor) {
            AnchorForm(
                onCancel = { showAddAnchor = false },
                onSave = { body ->
                    viewModel.addAnchor(body)
                    showAddAnchor = false
                },
            )
        } else {
            CadenceGhostButton(text = "+ Add anchor", onClick = { showAddAnchor = true }, modifier = Modifier.fillMaxWidth())
        }

        profile?.let { p ->
            LeaveSection(
                monthlyAllowance = p.leaveMonthlyAllowance,
                carryCap = p.leaveCarryCap,
                onSave = { allowance, cap -> viewModel.saveAccount(p.timezone, p.wakeStart, p.wakeEnd, allowance, cap) },
            )
            WakeWindowSection(
                wakeStart = p.wakeStart,
                wakeEnd = p.wakeEnd,
                onSave = { start, end -> viewModel.saveAccount(p.timezone, start, end, p.leaveMonthlyAllowance, p.leaveCarryCap) },
            )
        }

        com.cadence.app.ui.components.ToastEffect(signOutError, viewModel::dismissSignOutError)

        CadenceOutlinedButton(
            text = "Sign out",
            onClick = { if (hasAnyPendingWork) showSignOutConfirm = true else viewModel.signOut() },
        )

        if (showSignOutConfirm) {
            androidx.compose.material3.AlertDialog(
                onDismissRequest = { showSignOutConfirm = false },
                title = { Text("Sign out?") },
                text = { Text("Some changes haven't synced yet -- signing out now will lose them.", color = colors.stone) },
                confirmButton = {
                    androidx.compose.material3.TextButton(onClick = { showSignOutConfirm = false; viewModel.signOut() }) {
                        Text("Sign out anyway", color = colors.coral)
                    }
                },
                dismissButton = {
                    androidx.compose.material3.TextButton(onClick = { showSignOutConfirm = false }) { Text("Cancel") }
                },
            )
        }
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
private fun AvatarPickerDot(key: String, selectedKey: String, onClick: () -> Unit) {
    val colors = CadenceThemeTokens.colors
    val selected = selectedKey == key
    MarkAvatar(
        key = key,
        size = 44.dp,
        modifier = Modifier
            .clip(CircleShape)
            .clickable(onClick = onClick)
            .then(if (selected) Modifier.border(2.dp, colors.accent, CircleShape).padding(2.dp) else Modifier.padding(2.dp)),
    )
}

@Composable
private fun ItemRow(category: CategoryDto, onRemove: () -> Unit) {
    val colors = CadenceThemeTokens.colors
    CadenceCard {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                CategoryDot(category.color)
                Column {
                    Text(category.name, color = colors.inkBlack, fontWeight = FontWeight.Medium)
                    val targetLabel = category.weeklyTarget?.let {
                        if (category.trackingMode == "hours") "${it.toInt()}h/week" else "${it.toInt()} sessions/week"
                    } ?: "No minimum"
                    Text("$targetLabel · Tier ${category.priorityTier}", color = colors.stone, style = MaterialTheme.typography.bodySmall)
                }
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
private fun AnchorRow(anchor: AnchorDto, onRemove: () -> Unit) {
    val colors = CadenceThemeTokens.colors
    CadenceCard {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(anchor.label, color = colors.inkBlack, fontWeight = FontWeight.Medium)
                Text(
                    "${anchor.start}–${anchor.end} · ${describeRecurrence(anchor)}${if (!anchor.isFocusBlock) " · fixed" else ""}",
                    color = colors.stone,
                    style = MaterialTheme.typography.bodySmall,
                )
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
