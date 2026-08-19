package com.cadence.app.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
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
import com.cadence.app.ui.components.SettingsIcon
import com.cadence.app.ui.components.TimerIcon
import com.cadence.app.ui.components.TodayIcon
import com.cadence.app.ui.settings.SettingsScreen
import com.cadence.app.ui.theme.CadenceThemeTokens
import com.cadence.app.ui.today.TodayScreen
import com.cadence.app.ui.timer.TimerScreen

private sealed class CadenceDestination(val route: String, val label: String) {
    data object Today : CadenceDestination("today", "Today")
    data object Timer : CadenceDestination("timer", "Timer")
    data object Settings : CadenceDestination("settings", "Settings")
}

private val bottomNavDestinations = listOf(CadenceDestination.Today, CadenceDestination.Timer, CadenceDestination.Settings)

/** Phase 1's whole surface: Today / Timer / Settings (see the mobile build
 * plan's explicit "deferred" list -- Calendar, Progress, Leave planning,
 * Weekly Review etc. aren't built yet). */
@Composable
fun CadenceApp(repository: CadenceRepository, modifier: Modifier = Modifier) {
    val navController = rememberNavController()

    Scaffold(
        modifier = modifier,
        containerColor = CadenceThemeTokens.colors.paperWarmth,
        bottomBar = {
            val backStackEntry by navController.currentBackStackEntryAsState()
            val currentDestination = backStackEntry?.destination
            NavigationBar(containerColor = CadenceThemeTokens.colors.pureWhite) {
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
            composable(CadenceDestination.Settings.route) { SettingsScreen(repository) }
        }
    }
}

@Composable
private fun CadenceDestination.Icon() = when (this) {
    CadenceDestination.Today -> TodayIcon()
    CadenceDestination.Timer -> TimerIcon()
    CadenceDestination.Settings -> SettingsIcon()
}
