package com.cadence.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.themeDataStore: DataStore<Preferences> by preferencesDataStore(name = "cadence_theme_prefs")

/** "light" | "dark" | "system". Mirrors apps/web/src/lib/theme.ts exactly:
 * a device-level preference in its own store, deliberately not synced
 * through the account (unlike accent_color) and not cleared on sign-out --
 * a shared device shouldn't flip its display mode just because someone
 * else signed in. Defaults to "light", not the OS setting, for the same
 * reason theme.ts gives: an OS set to dark shouldn't silently make the app
 * dark before anyone actually chose that. */
class ThemePreferences(private val context: Context) {
    private object Keys {
        val MODE = stringPreferencesKey("theme_mode")
    }

    val mode: Flow<String> = context.themeDataStore.data.map { it[Keys.MODE] ?: "light" }

    suspend fun setMode(mode: String) {
        context.themeDataStore.edit { it[Keys.MODE] = mode }
    }
}
