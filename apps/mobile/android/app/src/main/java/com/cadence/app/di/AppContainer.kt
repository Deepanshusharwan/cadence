package com.cadence.app.di

import android.content.Context
import com.cadence.app.data.CadenceRepository
import com.cadence.app.data.local.CadenceLocalStore
import com.cadence.app.data.local.ThemePreferences
import com.cadence.app.network.ApiClient

/**
 * Manual composition root -- no Hilt/Dagger. The dependency graph here is
 * small and flat (one repository, one local store, one API client), so a
 * DI framework would add ceremony without buying anything; see the mobile
 * build plan's note on keeping the footprint minimal.
 */
class AppContainer(context: Context) {
    private val localStore = CadenceLocalStore(context.applicationContext)
    val repository = CadenceRepository(api = ApiClient.service, local = localStore, appContext = context.applicationContext)
    val themePreferences = ThemePreferences(context.applicationContext)
}
