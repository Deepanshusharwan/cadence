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
 * regardless of which one the SDK actually reads from at this call site.
 *
 * Deliberately does NOT override `primaryForeground`/`secondaryButtonBackground`/
 * `secondaryButtonForeground`/`neutral`: an earlier version did, and it broke
 * the GitHub/X social-sign-in buttons -- their brand marks are monochrome
 * glyphs Clerk tints for a *branded* (dark) background, and forcing every
 * social button onto one uniform light background (to match web's ghost-
 * button look) made those two icons render white-on-near-white and
 * effectively disappear. Facebook/Google's icons are fixed multi-color
 * bitmaps, so they looked fine and masked the problem until it was reported.
 * Leaving those fields at Clerk's own defaults keeps every provider's icon
 * readable; the fields below are the ones safe to repaint without touching
 * icon rendering. */
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
                inputForeground = CadenceColors.Dark.inkBlack,
                border = CadenceColors.Dark.hairline,
                ring = CadenceColors.notionBlue,
                muted = CadenceColors.Dark.skyTint,
                danger = CadenceColors.coral,
            )
        } else {
            ClerkColors(
                primary = CadenceColors.notionBlue,
                background = CadenceColors.Light.paperWarmth,
                input = CadenceColors.Light.pureWhite,
                foreground = CadenceColors.Light.inkBlack,
                mutedForeground = CadenceColors.Light.stone,
                inputForeground = CadenceColors.Light.inkBlack,
                border = CadenceColors.Light.hairline,
                ring = CadenceColors.notionBlue,
                muted = CadenceColors.Light.skyTint,
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
