package com.cadence.app.data

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.NetworkType
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.cadence.app.network.ApiResult

/** Flushes the session outbox (docs/architecture.md §4) once connectivity
 * is back -- the WorkManager half of "start/stop a session always works
 * offline; it syncs when the network returns" (spec §43-44). */
class SessionSyncWorker(
    context: Context,
    params: WorkerParameters,
    private val repository: CadenceRepository,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = when (repository.flushOutbox()) {
        is ApiResult.Success -> Result.success()
        is ApiResult.Failure -> Result.retry()
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "session-outbox-flush"

        fun enqueue(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<SessionSyncWorker>()
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
        }
    }
}
