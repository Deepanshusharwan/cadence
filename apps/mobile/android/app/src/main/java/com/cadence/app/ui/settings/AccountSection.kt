package com.cadence.app.ui.settings

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.cadence.app.ui.components.CadenceCard
import com.cadence.app.ui.theme.CadenceThemeTokens
import java.time.ZoneId

/** Mirrors apps/web/src/app/dashboard/settings/page.tsx's "Timezone &
 * notifications" section: a timezone picker (web's is a plain &lt;select&gt;
 * of every IANA zone; Android's equivalent is a searchable dialog since a
 * scrollable list of ~600 entries is unusable as an inline dropdown) plus
 * the schedule-block-reminders on/off toggle. Unlike web (which just calls
 * the browser Notification permission API), turning this on here requests
 * Android's POST_NOTIFICATIONS runtime permission (API 33+) -- see
 * notifications/ReminderScheduler.kt for what actually gets scheduled. */
@Composable
fun TimezoneNotificationsSection(
    timezone: String,
    notificationsEnabled: Boolean,
    onSetTimezone: (String) -> Unit,
    onSetNotificationsEnabled: (Boolean) -> Unit,
) {
    val colors = CadenceThemeTokens.colors
    var showTimezonePicker by remember { mutableStateOf(false) }
    val context = LocalContext.current

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        onSetNotificationsEnabled(granted)
    }

    if (showTimezonePicker) {
        TimezonePickerDialog(
            current = timezone,
            onDismiss = { showTimezonePicker = false },
            onSelect = {
                onSetTimezone(it)
                showTimezonePicker = false
            },
        )
    }

    CadenceCard {
        Text("TIMEZONE & NOTIFICATIONS", color = colors.stone, style = MaterialTheme.typography.bodySmall, fontWeight = androidx.compose.ui.text.font.FontWeight.Medium)

        Text("Timezone", color = colors.inkBlack, fontWeight = androidx.compose.ui.text.font.FontWeight.Medium, modifier = Modifier.padding(top = 8.dp))
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 4.dp).clickable { showTimezonePicker = true },
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(timezone, color = colors.stone)
            Text("Change", color = colors.accent)
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Schedule block reminders", color = colors.inkBlack, fontWeight = androidx.compose.ui.text.font.FontWeight.Medium)
                Text(
                    "A nudge a few minutes before a schedule block starts, and when a fixed block ends.",
                    color = colors.stone,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Text(
                if (notificationsEnabled) "On" else "Off",
                color = if (notificationsEnabled) colors.pureWhite else colors.stone,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = androidx.compose.ui.text.font.FontWeight.Medium,
                modifier = Modifier
                    .padding(start = 12.dp)
                    .background(if (notificationsEnabled) colors.accent else colors.hairline, androidx.compose.foundation.shape.CircleShape)
                    .clickable {
                        if (notificationsEnabled) {
                            onSetNotificationsEnabled(false)
                        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            val granted = androidx.core.content.ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
                                PackageManager.PERMISSION_GRANTED
                            if (granted) onSetNotificationsEnabled(true) else permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                        } else {
                            onSetNotificationsEnabled(true)
                        }
                    }
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            )
        }
    }
}

@Composable
private fun TimezonePickerDialog(current: String, onDismiss: () -> Unit, onSelect: (String) -> Unit) {
    var query by remember { mutableStateOf("") }
    val allZones = remember { ZoneId.getAvailableZoneIds().sorted() }
    val filtered = remember(query) { allZones.filter { it.contains(query, ignoreCase = true) } }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Timezone") },
        text = {
            Column {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    label = { Text("Search") },
                    modifier = Modifier.fillMaxWidth(),
                )
                LazyColumn(modifier = Modifier.padding(top = 8.dp)) {
                    items(filtered) { zone ->
                        Text(
                            zone,
                            fontWeight = if (zone == current) androidx.compose.ui.text.font.FontWeight.Bold else androidx.compose.ui.text.font.FontWeight.Normal,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelect(zone) }
                                .padding(vertical = 10.dp),
                        )
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

/** Mirrors web's "Leave" section: monthly leave units + max accumulated
 * (carry-cap) balance. */
@Composable
fun LeaveSection(monthlyAllowance: Int, carryCap: Int, onSave: (monthlyAllowance: Int, carryCap: Int) -> Unit) {
    val colors = CadenceThemeTokens.colors
    var allowanceText by remember(monthlyAllowance) { mutableStateOf(monthlyAllowance.toString()) }
    var carryCapText by remember(carryCap) { mutableStateOf(carryCap.toString()) }

    CadenceCard {
        Text("LEAVE", color = colors.stone, style = MaterialTheme.typography.bodySmall, fontWeight = androidx.compose.ui.text.font.FontWeight.Medium)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(top = 8.dp)) {
            OutlinedTextField(
                value = allowanceText,
                onValueChange = { allowanceText = it.filter(Char::isDigit) },
                label = { Text("Monthly units") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = carryCapText,
                onValueChange = { carryCapText = it.filter(Char::isDigit) },
                label = { Text("Max balance") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
            )
        }
        Text(
            "Unused units carry into next month, capped at your max balance above.",
            color = colors.stone,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(top = 8.dp),
        )
        TextButton(
            onClick = {
                val allowance = allowanceText.toIntOrNull() ?: monthlyAllowance
                val cap = carryCapText.toIntOrNull() ?: carryCap
                onSave(allowance, cap)
            },
            modifier = Modifier.padding(top = 4.dp),
        ) { Text("Save", color = colors.accent) }
    }
}

/** Mirrors web's "Wake window" section: the From/Start time used to shape
 * the planner's schedule (spec's wake-window concept). */
@Composable
fun WakeWindowSection(wakeStart: String, wakeEnd: String, onSave: (start: String, end: String) -> Unit) {
    val colors = CadenceThemeTokens.colors
    var startText by remember(wakeStart) { mutableStateOf(wakeStart) }
    var endText by remember(wakeEnd) { mutableStateOf(wakeEnd) }

    CadenceCard {
        Text("WAKE WINDOW", color = colors.stone, style = MaterialTheme.typography.bodySmall, fontWeight = androidx.compose.ui.text.font.FontWeight.Medium)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(top = 8.dp)) {
            OutlinedTextField(
                value = startText,
                onValueChange = { startText = it },
                label = { Text("From (HH:MM)") },
                modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = endText,
                onValueChange = { endText = it },
                label = { Text("To (HH:MM)") },
                modifier = Modifier.weight(1f),
            )
        }
        TextButton(
            onClick = { onSave(startText, endText) },
            modifier = Modifier.padding(top = 4.dp),
        ) { Text("Save", color = colors.accent) }
    }
}
