package com.cadence.app.data

import android.content.Context
import androidx.work.WorkerFactory
import androidx.work.WorkerParameters

/** [OutboxSyncWorker] takes a [CadenceRepository] constructor argument, so
 * WorkManager's default reflection-based factory can't build it -- this
 * hands it the same repository instance the rest of the app uses (see
 * di/AppContainer.kt), so a queued write flushed by the worker shows up
 * immediately if the app is also open. */
class CadenceWorkerFactory(private val repository: CadenceRepository) : WorkerFactory() {
    override fun createWorker(
        appContext: Context,
        workerClassName: String,
        workerParameters: WorkerParameters,
    ) = when (workerClassName) {
        OutboxSyncWorker::class.java.name -> OutboxSyncWorker(appContext, workerParameters, repository)
        else -> null
    }
}
