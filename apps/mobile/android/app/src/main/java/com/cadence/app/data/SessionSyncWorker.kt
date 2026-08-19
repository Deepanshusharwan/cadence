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

/** Flushes both offline outboxes (docs/architecture.md §4: session logging
 * and day-type/leave marking) once connectivity is back. Despite the name
 * (kept from when this only handled sessions) it now drains both queues --
 * this is the WorkManager half of "these two actions always work offline;
 * they sync when the network returns" (spec §43-44, architecture.md §4). */
class SessionSyncWorker(
    context: Context,
    params: WorkerParameters,
    private val repository: CadenceRepository,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val sessionResult = repository.flushSessionOutbox()
        val dayEntryResult = repository.flushDayEntryOutbox()
        return if (sessionResult is ApiResult.Success && dayEntryResult is ApiResult.Success) {
            Result.success()
        } else {
            Result.retry()
        }
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "outbox-flush"

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
