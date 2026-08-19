package com.cadence.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.cadence.app.ui.theme.CadenceThemeTokens

/** Mirrors apps/web's "add item" form -- used from Settings (adding to an
 * existing account) and Setup (building the first few items). */
@Composable
fun ItemForm(
    onCancel: (() -> Unit)?,
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
            if (onCancel != null) {
                CadenceGhostButton(text = "Cancel", onClick = onCancel)
            }
        }
    }
}
