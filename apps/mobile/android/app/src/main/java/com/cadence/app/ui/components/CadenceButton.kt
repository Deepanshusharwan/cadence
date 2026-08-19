package com.cadence.app.ui.components

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cadence.app.ui.theme.CadenceShapes
import com.cadence.app.ui.theme.CadenceThemeTokens

/** notion-web-design skill's "Primary CTA Button" -- the one filled,
 * chromatic (notion-blue) action per screen; everything else defers to
 * [CadenceGhostButton] or plain text. */
@Composable
fun CadencePrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    val colors = CadenceThemeTokens.colors
    Button(
        onClick = onClick,
        modifier = modifier,
        enabled = enabled,
        shape = CadenceShapes.button,
        colors = ButtonDefaults.buttonColors(containerColor = colors.notionBlue, contentColor = colors.pureWhite),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp),
    ) {
        Text(text)
    }
}

/** notion-web-design skill's "Ghost CTA Button" -- sky-tint fill, notion-blue
 * text, for the lower-commitment secondary action beside a primary one. */
@Composable
fun CadenceGhostButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    val colors = CadenceThemeTokens.colors
    Button(
        onClick = onClick,
        modifier = modifier,
        enabled = enabled,
        shape = CadenceShapes.button,
        colors = ButtonDefaults.buttonColors(containerColor = colors.skyTint, contentColor = colors.notionBlue),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp),
    ) {
        Text(text)
    }
}

@Composable
fun CadenceOutlinedButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    val colors = CadenceThemeTokens.colors
    OutlinedButton(
        onClick = onClick,
        modifier = modifier,
        enabled = enabled,
        shape = CadenceShapes.small,
        colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.inkBlack),
    ) {
        Text(text)
    }
}
