package com.cadence.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.unit.dp

val LocalCadenceColors = staticCompositionLocalOf { LightCadenceColorTokens }

/** Cards use a 1px hairline border instead of a shadow -- see
 * CadenceColorTokens.hairline and the notion-web-design skill's
 * "Do not add shadows to content cards" rule. Exposed here so every
 * card composable pulls the same width rather than each guessing 1.dp. */
val CadenceHairlineWidth = 1.dp

@Composable
fun CadenceTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val tokens = if (darkTheme) DarkCadenceColorTokens else LightCadenceColorTokens

    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = tokens.notionBlue,
            onPrimary = tokens.pureWhite,
            secondary = tokens.skyTint,
            onSecondary = tokens.notionBlue,
            background = tokens.paperWarmth,
            onBackground = tokens.inkBlack,
            surface = tokens.pureWhite,
            onSurface = tokens.inkBlack,
            surfaceVariant = tokens.pureWhite,
            onSurfaceVariant = tokens.graphite,
            outline = tokens.hairline,
            error = CadenceColors.coral,
        )
    } else {
        lightColorScheme(
            primary = tokens.notionBlue,
            onPrimary = tokens.pureWhite,
            secondary = tokens.skyTint,
            onSecondary = tokens.notionBlue,
            background = tokens.paperWarmth,
            onBackground = tokens.inkBlack,
            surface = tokens.pureWhite,
            onSurface = tokens.inkBlack,
            surfaceVariant = tokens.pureWhite,
            onSurfaceVariant = tokens.graphite,
            outline = tokens.hairline,
            error = CadenceColors.coral,
        )
    }

    CompositionLocalProvider(LocalCadenceColors provides tokens) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = cadenceMaterialTypography(),
            shapes = CadenceMaterialShapes,
            content = content,
        )
    }
}

/** Shorthand so screens write `CadenceThemeTokens.colors.stone` at the call
 * site instead of `LocalCadenceColors.current.stone`. */
object CadenceThemeTokens {
    val colors: CadenceColorTokens
        @Composable get() = LocalCadenceColors.current
}
