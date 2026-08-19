package com.cadence.app.network

import java.io.IOException
import retrofit2.HttpException

/** Mirrors apps/web/src/lib/api.ts's `ApiError` (carries the real HTTP
 * status so callers can branch on it, e.g. a banned account's 403) without
 * letting raw Retrofit/OkHttp exceptions leak into ViewModels. */
sealed interface ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>
    data class Failure(val status: Int?, val message: String) : ApiResult<Nothing>
}

suspend fun <T> apiCall(block: suspend () -> T): ApiResult<T> = try {
    ApiResult.Success(block())
} catch (e: HttpException) {
    ApiResult.Failure(e.code(), e.message())
} catch (e: IOException) {
    ApiResult.Failure(null, e.message ?: "Network error")
}
