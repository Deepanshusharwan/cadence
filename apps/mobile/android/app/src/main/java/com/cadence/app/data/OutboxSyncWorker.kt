package com.cadence.app.data

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.NetworkType
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.flow.first

/** Flushes every offline outbox (docs/architecture.md §4's cache+outbox
 * model, now covering every mutation in the app, not just session logging
 * and day-type marking) once connectivity is back. A single call into
 * [CadenceRepository.flushAllOutboxes] -- that function already holds
 * [CadenceRepository]'s own mutex and runs every entity type in the fixed
 * priority order the ID-remapping logic depends on, so this worker doesn't
 * need to know anything about that ordering itself. */
class OutboxSyncWorker(
    context: Context,
    params: WorkerParameters,
    private val repository: CadenceRepository,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        repository.flushAllOutboxes()
        val stillPending = repository.hasAnyPendingWork.first()
        return if (stillPending) Result.retry() else Result.success()
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "outbox-flush"

        fun enqueue(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<OutboxSyncWorker>()
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
        }
    }
}
