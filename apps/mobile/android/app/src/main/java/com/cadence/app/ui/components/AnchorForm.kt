package com.cadence.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cadence.app.network.dto.AnchorCreateDto
import com.cadence.app.ui.theme.CadenceThemeTokens

/** Monday-first display, JS Date.getDay() values underneath (0=Sunday) --
 * matches apps/web/src/app/dashboard/settings/page.tsx's WEEKDAY_OPTIONS
 * exactly, so a "weekly" anchor means the same days on both clients. */
private val WEEKDAY_OPTIONS = listOf(1 to "M", 2 to "T", 3 to "W", 4 to "T", 5 to "F", 6 to "S", 0 to "S")
private val RECURRENCE_OPTIONS = listOf("daily" to "Every day", "weekly" to "Specific days", "once" to "One-off date")

/** Mirrors apps/web/src/app/dashboard/settings/page.tsx's "add anchor" form
 * -- used both from Settings (editing an existing schedule) and Setup
 * (building one for the first time). Deliberately simplified from web:
 * plain HH:MM/YYYY-MM-DD text fields instead of native date/time pickers,
 * and no "pin items" category selector (web itself labels that optional --
 * the planner just auto-assigns instead, same as any other flexible block). */
@Composable
fun AnchorForm(onCancel: (() -> Unit)?, onSave: (AnchorCreateDto) -> Unit) {
    val colors = CadenceThemeTokens.colors
    var label by remember { mutableStateOf("") }
    var start by remember { mutableStateOf("09:00") }
    var end by remember { mutableStateOf("10:00") }
    var recurrence by remember { mutableStateOf("daily") }
    var daysOfWeek by remember { mutableStateOf(setOf<Int>()) }
    var date by remember { mutableStateOf("") }
    var isFocusBlock by remember { mutableStateOf(true) }

    val canSave = label.isNotBlank() &&
        (recurrence != "weekly" || daysOfWeek.isNotEmpty()) &&
        (recurrence != "once" || date.isNotBlank())

    CadenceCard {
        OutlinedTextField(
            value = label,
            onValueChange = { label = it },
            label = { Text("e.g. Gym, Class, Evening focus") },
            modifier = Modifier.fillMaxWidth(),
        )

        Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = start,
                onValueChange = { start = it },
                label = { Text("Start (HH:MM)") },
                modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = end,
                onValueChange = { end = it },
                label = { Text("End (HH:MM)") },
                modifier = Modifier.weight(1f),
            )
        }

        Text("Repeats", color = colors.stone, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
            RECURRENCE_OPTIONS.forEach { (key, text) ->
                FilterChip(
                    selected = recurrence == key,
                    onClick = { recurrence = key },
                    label = { Text(text) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = colors.accent, selectedLabelColor = colors.pureWhite),
                )
            }
        }

        if (recurrence == "weekly") {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
                WEEKDAY_OPTIONS.forEach { (day, letter) ->
                    FilterChip(
                        selected = day in daysOfWeek,
                        onClick = { daysOfWeek = if (day in daysOfWeek) daysOfWeek - day else daysOfWeek + day },
                        label = { Text(letter) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = colors.accent, selectedLabelColor = colors.pureWhite),
                    )
                }
            }
        }

        if (recurrence == "once") {
            OutlinedTextField(
                value = date,
                onValueChange = { date = it },
                label = { Text("Date (YYYY-MM-DD)") },
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            )
        }

        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
            Checkbox(checked = isFocusBlock, onCheckedChange = { isFocusBlock = it })
            Text("Flexible focus block (planner assigns an item)", color = colors.inkBlack, style = MaterialTheme.typography.bodySmall)
        }
        Text(
            if (isFocusBlock) {
                "This time is open -- Cadence decides what to work on."
            } else {
                "Fixed commitment -- just blocked off, nothing gets scheduled into it."
            },
            color = colors.stone,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(start = 32.dp, top = 2.dp),
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
            CadencePrimaryButton(
                text = "Save",
                enabled = canSave,
                onClick = {
                    onSave(
                        AnchorCreateDto(
                            label = label.trim(),
                            start = start,
                            end = end,
                            recurrence = recurrence,
                            daysOfWeek = daysOfWeek.toList(),
                            date = if (recurrence == "once") date else null,
                            isFocusBlock = isFocusBlock,
                        )
                    )
                },
            )
            if (onCancel != null) {
                CadenceGhostButton(text = "Cancel", onClick = onCancel)
            }
        }
    }
}
