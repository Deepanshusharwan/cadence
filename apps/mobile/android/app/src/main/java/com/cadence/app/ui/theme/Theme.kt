package com.cadence.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

val LocalCadenceColors = staticCompositionLocalOf { LightCadenceColorTokens }

/** Cards use a 1px hairline border instead of a shadow -- see
 * CadenceColorTokens.hairline and the notion-web-design skill's
 * "Do not add shadows to content cards" rule. Exposed here so every
 * card composable pulls the same width rather than each guessing 1.dp. */
val CadenceHairlineWidth = 1.dp

/**
 * @param darkTheme Resolved by the caller from the user's Appearance choice
 * (light/dark/system -- see data/ThemePreferences.kt), not
 * `isSystemInDarkTheme()` directly. Mirrors apps/web/src/lib/theme.ts's
 * deliberate choice to default new users to light rather than silently
 * following the OS, while still offering "system" as a real, explicit choice.
 * @param accentColor Resolved from the signed-in user's `accent_color`
 * (see ui/theme/Color.kt's ACCENT_OPTIONS/accentColorFor) -- defaults to
 * notion-blue, same as the backend's own column default.
 */
@Composable
fun CadenceTheme(
    darkTheme: Boolean,
    accentColor: Color = CadenceColors.notionBlue,
    content: @Composable () -> Unit,
) {
    val baseTokens = if (darkTheme) DarkCadenceColorTokens else LightCadenceColorTokens
    val tokens = baseTokens.copy(accent = accentColor)

    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = tokens.accent,
            onPrimary = tokens.pureWhite,
            secondary = tokens.skyTint,
            onSecondary = tokens.accent,
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
            primary = tokens.accent,
            onPrimary = tokens.pureWhite,
            secondary = tokens.skyTint,
            onSecondary = tokens.accent,
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
