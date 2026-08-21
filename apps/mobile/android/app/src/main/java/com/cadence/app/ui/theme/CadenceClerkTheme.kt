package com.cadence.app.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.clerk.api.ui.ClerkColors
import com.clerk.api.ui.ClerkDesign
import com.clerk.api.ui.ClerkTheme

/** Themes Clerk's prebuilt Android `AuthView` (sign-in *and* sign-up --
 * unlike web, which has separate `<SignIn>`/`<SignUp>` components on two
 * routes, Clerk's Android SDK is one unified flow, so there's no separate
 * "sign-up screen" to build here) to match the app's own design system,
 * mirroring apps/web/src/lib/clerk-appearance.ts's `clerkAppearance`
 * object field-for-field where a native equivalent exists. Built from
 * [darkTheme] rather than left to Clerk's own light/dark detection, so it
 * always agrees with CadenceRoot's already-resolved theme (device
 * Appearance preference, not just the OS setting) -- the same resolved
 * palette is passed for `colors`/`lightColors`/`darkColors` so it's correct
 * regardless of which one the SDK actually reads from at this call site. */
@Composable
fun rememberCadenceClerkTheme(darkTheme: Boolean): ClerkTheme {
    return remember(darkTheme) {
        val colors = if (darkTheme) {
            ClerkColors(
                primary = CadenceColors.notionBlue,
                background = CadenceColors.Dark.paperWarmth,
                input = CadenceColors.Dark.pureWhite,
                foreground = CadenceColors.Dark.inkBlack,
                mutedForeground = CadenceColors.Dark.stone,
                primaryForeground = CadenceColors.Dark.paperWarmth,
                inputForeground = CadenceColors.Dark.inkBlack,
                neutral = CadenceColors.Dark.stone,
                border = CadenceColors.Dark.hairline,
                ring = CadenceColors.notionBlue,
                muted = CadenceColors.Dark.skyTint,
                secondaryButtonBackground = CadenceColors.Dark.skyTint,
                secondaryButtonForeground = CadenceColors.notionBlue,
                danger = CadenceColors.coral,
            )
        } else {
            ClerkColors(
                primary = CadenceColors.notionBlue,
                background = CadenceColors.Light.paperWarmth,
                input = CadenceColors.Light.pureWhite,
                foreground = CadenceColors.Light.inkBlack,
                mutedForeground = CadenceColors.Light.stone,
                primaryForeground = CadenceColors.Light.pureWhite,
                inputForeground = CadenceColors.Light.inkBlack,
                neutral = CadenceColors.Light.stone,
                border = CadenceColors.Light.hairline,
                ring = CadenceColors.notionBlue,
                muted = CadenceColors.Light.skyTint,
                secondaryButtonBackground = CadenceColors.Light.skyTint,
                secondaryButtonForeground = CadenceColors.notionBlue,
                danger = CadenceColors.coral,
            )
        }
        ClerkTheme(
            colors = colors,
            lightColors = colors,
            darkColors = colors,
            design = ClerkDesign(),
        )
    }
}
