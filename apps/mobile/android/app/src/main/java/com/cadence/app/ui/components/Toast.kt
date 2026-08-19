package com.cadence.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.unit.dp
import com.cadence.app.ui.theme.CadenceThemeTokens
import kotlinx.coroutines.delay

/** Small in-memory holder for the one floating toast on screen at a time --
 * mirrors apps/web/src/components/toast.tsx's ToastProvider (a fixed
 * bottom-center stack) but Android only ever needs to show the latest
 * message, so a single nullable slot replaces web's queue/array. */
class ToastState {
    var message by mutableStateOf<String?>(null)
        private set

    fun show(text: String) {
        message = text
    }

    fun clear() {
        message = null
    }
}

val LocalToastState = compositionLocalOf<ToastState> {
    error("LocalToastState not provided -- wrap the screen in CadenceApp's ToastHost")
}

/** Surfaces [message] as a floating toast the moment it becomes non-null,
 * then calls [onShown] so the caller can clear its own state (otherwise the
 * same message would re-fire every recomposition). */
@Composable
fun ToastEffect(message: String?, onShown: () -> Unit) {
    val toastState = LocalToastState.current
    LaunchedEffect(message) {
        if (message != null) {
            toastState.show(message)
            onShown()
        }
    }
}

/** Renders the one active toast, bottom-center, over everything else --
 * mirrors web's fixed/bottom-6/rounded-lg/border-hairline/shadow card with
 * a small circular leading badge, except the badge uses this account's
 * accent color (Cadence's own Plus customization) rather than web's fixed
 * marigold, since a toast that ignores the user's chosen accent would read
 * as visually disconnected from the rest of the themed UI. Auto-dismisses
 * after 2.6s, same duration as web's default (non-celebration) toast. */
@Composable
fun ToastHost(state: ToastState, modifier: Modifier = Modifier) {
    val colors = CadenceThemeTokens.colors
    val message = state.message

    LaunchedEffect(message) {
        if (message != null) {
            delay(2600)
            state.clear()
        }
    }

    Box(modifier = modifier.fillMaxSize().padding(bottom = 96.dp), contentAlignment = Alignment.BottomCenter) {
        AnimatedVisibility(
            visible = message != null,
            enter = fadeIn() + slideInVertically(initialOffsetY = { it / 3 }),
            exit = fadeOut() + slideOutVertically(targetOffsetY = { it / 3 }),
        ) {
            Box(
                modifier = Modifier
                    .shadow(elevation = 6.dp, shape = RoundedCornerShape(8.dp), ambientColor = colors.inkBlack.copy(alpha = 0.12f))
                    .clip(RoundedCornerShape(8.dp))
                    .background(colors.pureWhite)
                    .border(BorderStroke(1.dp, colors.hairline), RoundedCornerShape(8.dp))
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(
                        modifier = Modifier.size(16.dp).clip(CircleShape).background(colors.accent),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("✓", color = colors.pureWhite, style = MaterialTheme.typography.labelSmall)
                    }
                    Text(message ?: "", color = colors.inkBlack, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}
