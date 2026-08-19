package com.cadence.app

import android.app.Application
import androidx.work.Configuration
import com.clerk.api.Clerk
import com.cadence.app.data.CadenceWorkerFactory
import com.cadence.app.di.AppContainer

class CadenceApplication : Application(), Configuration.Provider {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        // Same Clerk project as backend/.env + apps/web/.env.local -- see
        // backend/README.md "Connecting a Clerk project".
        Clerk.initialize(this, publishableKey = BuildConfig.CLERK_PUBLISHABLE_KEY)
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(CadenceWorkerFactory(container.repository))
            .build()
}
