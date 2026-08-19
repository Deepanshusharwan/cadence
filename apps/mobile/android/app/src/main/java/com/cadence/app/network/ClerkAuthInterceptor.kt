package com.cadence.app.network

import com.clerk.api.Clerk
import com.clerk.api.network.serialization.ClerkResult
import com.clerk.api.session.fetchToken
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Attaches the signed-in user's Clerk session JWT as a Bearer token on every
 * request -- the native-SDK equivalent of apps/web/src/lib/api.ts's
 * ApiFetch, which pulls the token from ClerkTokenBridge and sends
 * `Authorization: Bearer <token>`. `Session.fetchToken()` is a suspend
 * call; OkHttp interceptors run off the main thread already (Retrofit's
 * suspend functions dispatch through OkHttp's own call executor), so
 * `runBlocking` here is the standard, safe pattern for this SDK rather than
 * a main-thread-blocking risk.
 */
class ClerkAuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val session = Clerk.session ?: return chain.proceed(request)

        val jwt = runBlocking {
            when (val result = session.fetchToken()) {
                is ClerkResult.Success -> result.value.jwt
                is ClerkResult.Failure -> null
            }
        }

        val authedRequest = if (jwt != null) {
            request.newBuilder().addHeader("Authorization", "Bearer $jwt").build()
        } else {
            request
        }
        return chain.proceed(authedRequest)
    }
}
