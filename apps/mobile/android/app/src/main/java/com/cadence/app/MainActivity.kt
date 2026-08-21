package com.cadence.app

import android.app.Activity
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cadence.app.di.AppContainer
import com.cadence.app.ui.CadenceApp
import com.cadence.app.ui.setup.SetupScreen
import com.cadence.app.ui.theme.CadenceTheme
import com.cadence.app.ui.theme.accentColorFor
import com.cadence.app.ui.theme.rememberCadenceClerkTheme
import com.clerk.api.Clerk
import com.clerk.ui.auth.AuthView

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        requestHighestRefreshRate()
        setContent {
            CadenceRoot(container = (application as CadenceApplication).container)
        }
    }

    /** Opts into the display's highest refresh rate (90/120Hz on phones
     * that support it) instead of the 60Hz default -- Compose animations
     * (chip selection, pull-to-refresh, the timer's per-second ticks) read
     * noticeably smoother. One-time request; Android may still cap it
     * lower under battery saver, same as any other app. */
    private fun requestHighestRefreshRate() {
        val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            display
        } else {
            @Suppress("DEPRECATION")
            windowManager.defaultDisplay
        }
        val bestMode = display?.supportedModes?.maxByOrNull { it.refreshRate } ?: return
        window.attributes = window.attributes.apply { preferredDisplayModeId = bestMode.modeId }
    }
}

@Composable
private fun CadenceRoot(container: AppContainer) {
    val isInitialized by Clerk.isInitialized.collectAsStateWithLifecycle()
    // Gates on whether a user is actually signed in (matches the Clerk
    // quickstart sample's MainViewModel pattern) -- `isAuthFlowCompleteFlow`
    // tracks whether the auth *UI flow* was dismissed, not whether a
    // session exists, and let a signed-out device straight through to the
    // app (surfaced as 401s from the backend, since ClerkAuthInterceptor
    // had no session to pull a token from).
    val user by Clerk.userFlow.collectAsStateWithLifecycle()

    // Resolves onboarded/routing state right after sign-in. Nothing else
    // triggers this fetch when the destination is Setup (that screen
    // replaces the whole app, so TodayViewModel/etc.'s own refreshAll()
    // never runs) -- without this, `profile` would stay null forever and
    // the loading spinner below would never resolve.
    LaunchedEffect(user) {
        if (user != null) container.repository.refreshProfile()
    }

    // Appearance (light/dark/system) is a device-level preference, kept
    // separate from the account and defaulting to light -- see
    // data/local/ThemePreferences.kt, mirroring apps/web/src/lib/theme.ts.
    // Accent color is per-account (synced via PATCH /me's accent_color),
    // so it's only meaningful once signed in -- notion-blue otherwise.
    val themeMode by container.themePreferences.mode.collectAsStateWithLifecycle(initialValue = "light")
    val profile by container.repository.profile.collectAsStateWithLifecycle(initialValue = null)
    val darkTheme = when (themeMode) {
        "dark" -> true
        "system" -> isSystemInDarkTheme()
        else -> false
    }
    val accentColor = accentColorFor(profile?.accentColor)

    // Status bar/nav bar icons need to flip dark<->light along with the
    // resolved theme (not just once at startup, since the user can toggle
    // Appearance while the app is open) -- the standard SideEffect pattern
    // for a dynamically-themed edge-to-edge Compose app.
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            val controller = WindowCompat.getInsetsController(window, view)
            controller.isAppearanceLightStatusBars = !darkTheme
            controller.isAppearanceLightNavigationBars = !darkTheme
        }
    }

    CadenceTheme(darkTheme = darkTheme, accentColor = accentColor) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            when {
                !isInitialized -> CircularProgressIndicator()
                user == null -> AuthView(
                    clerkTheme = rememberCadenceClerkTheme(darkTheme),
                    isDismissible = false,
                    startSocialOAuthAsSignUp = true,
                )
                profile == null -> CircularProgressIndicator()
                profile?.onboarded == false -> SetupScreen(repository = container.repository)
                else -> CadenceApp(
                    repository = container.repository,
                    themePreferences = container.themePreferences,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
    }
}
