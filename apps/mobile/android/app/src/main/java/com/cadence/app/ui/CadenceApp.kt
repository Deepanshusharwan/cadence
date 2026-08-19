package com.cadence.app.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.cadence.app.data.CadenceRepository
import com.cadence.app.data.local.ThemePreferences
import com.cadence.app.ui.calendar.CalendarScreen
import com.cadence.app.ui.components.CalendarIcon
import com.cadence.app.ui.components.ProgressIcon
import com.cadence.app.ui.components.SettingsIcon
import com.cadence.app.ui.components.TimerIcon
import com.cadence.app.ui.components.TodayIcon
import com.cadence.app.ui.progress.ProgressScreen
import com.cadence.app.ui.review.ReviewScreen
import com.cadence.app.ui.settings.SettingsScreen
import com.cadence.app.ui.theme.CadenceThemeTokens
import com.cadence.app.ui.today.TodayScreen
import com.cadence.app.ui.timer.TimerScreen

private sealed class CadenceDestination(val route: String, val label: String) {
    data object Today : CadenceDestination("today", "Today")
    data object Timer : CadenceDestination("timer", "Timer")
    data object Calendar : CadenceDestination("calendar", "Calendar")
    data object Progress : CadenceDestination("progress", "Progress")
    data object Settings : CadenceDestination("settings", "Settings")
    data object Review : CadenceDestination("review", "Review") // reached from Progress, not in bottom nav
}

private val bottomNavDestinations = listOf(
    CadenceDestination.Today,
    CadenceDestination.Timer,
    CadenceDestination.Calendar,
    CadenceDestination.Progress,
    CadenceDestination.Settings,
)

/** Today / Timer / Calendar / Progress (+ nested Review) / Settings -- see
 * the mobile build plan's deferred list for what's still web-only (sharing,
 * calendar-feed, export, billing, admin/feedback, notifications). */
@Composable
fun CadenceApp(repository: CadenceRepository, themePreferences: ThemePreferences, modifier: Modifier = Modifier) {
    val navController = rememberNavController()

    Scaffold(
        modifier = modifier,
        containerColor = CadenceThemeTokens.colors.paperWarmth,
        bottomBar = {
            val backStackEntry by navController.currentBackStackEntryAsState()
            val currentDestination = backStackEntry?.destination
            val colors = CadenceThemeTokens.colors
            NavigationBar(containerColor = colors.pureWhite) {
                bottomNavDestinations.forEach { destination ->
                    val selected = currentDestination?.hierarchy?.any { it.route == destination.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(destination.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { destination.Icon() },
                        label = { Text(destination.label) },
                        // Material3's auto-harmonized defaults (derived from
                        // a partially-specified ColorScheme) landed on a
                        // low-contrast selected label in dark mode -- set
                        // every role explicitly against our own tokens
                        // instead of trusting the derived ones.
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = colors.accent,
                            selectedTextColor = colors.accent,
                            indicatorColor = colors.skyTint,
                            unselectedIconColor = colors.stone,
                            unselectedTextColor = colors.stone,
                        ),
                    )
                }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = CadenceDestination.Today.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(CadenceDestination.Today.route) { TodayScreen(repository) }
            composable(CadenceDestination.Timer.route) { TimerScreen(repository) }
            composable(CadenceDestination.Calendar.route) { CalendarScreen(repository) }
            composable(CadenceDestination.Progress.route) {
                ProgressScreen(repository, onOpenReview = { navController.navigate(CadenceDestination.Review.route) })
            }
            composable(CadenceDestination.Review.route) { ReviewScreen(repository) }
            composable(CadenceDestination.Settings.route) { SettingsScreen(repository, themePreferences) }
        }
    }
}

@Composable
private fun CadenceDestination.Icon() = when (this) {
    CadenceDestination.Today -> TodayIcon()
    CadenceDestination.Timer -> TimerIcon()
    CadenceDestination.Calendar -> CalendarIcon()
    CadenceDestination.Progress -> ProgressIcon()
    CadenceDestination.Settings -> SettingsIcon()
    CadenceDestination.Review -> ProgressIcon() // never shown in bottom nav
}
