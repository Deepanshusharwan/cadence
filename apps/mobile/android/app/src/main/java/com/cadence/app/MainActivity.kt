package com.cadence.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cadence.app.ui.CadenceApp
import com.cadence.app.ui.theme.CadenceTheme
import com.clerk.api.Clerk
import com.clerk.ui.auth.AuthView

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CadenceTheme {
                CadenceRoot(container = (application as CadenceApplication).container)
            }
        }
    }
}

@Composable
private fun CadenceRoot(container: com.cadence.app.di.AppContainer) {
    val isInitialized by Clerk.isInitialized.collectAsStateWithLifecycle()
    val isAuthFlowComplete by Clerk.isAuthFlowCompleteFlow.collectAsStateWithLifecycle()

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        when {
            !isInitialized -> CircularProgressIndicator()
            !isAuthFlowComplete -> AuthView(isDismissible = false)
            else -> CadenceApp(repository = container.repository, modifier = Modifier.fillMaxSize())
        }
    }
}
