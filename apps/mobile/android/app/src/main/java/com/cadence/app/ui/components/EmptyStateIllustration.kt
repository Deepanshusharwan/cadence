package com.cadence.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.cadence.app.ui.theme.CadenceThemeTokens
import com.cadence.app.ui.theme.categoryColorFor

/** Small colored dot mirroring the web dashboard's own category chips
 * (`h-2.5 w-2.5 rounded-full ${c.color}`, apps/web/src/app/dashboard/page.tsx)
 * -- used anywhere a category/item is listed so its accent color (server-
 * assigned, see backend/app/routers/categories.py's ACCENT_CLASSES) is
 * visible, not just its name. */
@Composable
fun CategoryDot(colorClass: String?, modifier: Modifier = Modifier) {
    val color = categoryColorFor(colorClass)
    Canvas(modifier.size(10.dp)) { drawCircle(color) }
}

/** Illustration + heading + subtext -- mirrors the empty-state pattern
 * used across apps/web/src/app/dashboard/{page,progress,calendar}.tsx
 * (see apps/web/public/illustrations/README.md for the art itself). Skips
 * the web's CTA link (those cross into other bottom-nav tabs, which this
 * screen has no direct navigation handle to) as a documented simplification. */
@Composable
fun EmptyStateIllustration(drawableRes: Int, title: String, subtitle: String, modifier: Modifier = Modifier) {
    val colors = CadenceThemeTokens.colors
    Column(
        modifier = modifier.fillMaxWidth().padding(vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(
            painter = painterResource(drawableRes),
            contentDescription = null,
            modifier = Modifier.widthIn(max = 160.dp),
        )
        Text(
            title,
            color = colors.inkBlack,
            fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(top = 12.dp),
            textAlign = TextAlign.Center,
        )
        Text(
            subtitle,
            color = colors.stone,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(top = 4.dp).widthIn(max = 260.dp),
            textAlign = TextAlign.Center,
        )
    }
}
