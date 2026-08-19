package com.cadence.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

/**
 * Small hand-drawn nav icons, in the spirit of apps/web/src/components/icons.tsx
 * ("Hand-coded inline SVG, currentColor-based ... no icon library") rather
 * than pulling in the material-icons-extended dependency for three glyphs.
 * Drawn with Canvas primitives (not ImageVector path data) so there's no
 * hand-typed SVG path string to get subtly wrong without a way to preview it.
 */
private val strokeWidth = 1.8.dp

@Composable
fun TodayIcon(modifier: Modifier = Modifier, tint: Color = LocalContentColor.current) {
    Canvas(modifier = modifier.size(24.dp)) {
        val stroke = Stroke(width = strokeWidth.toPx(), cap = StrokeCap.Round)
        val r = size.minDimension / 2 * 0.8f
        val center = Offset(size.width / 2, size.height / 2)
        drawCircle(color = tint, radius = r, center = center, style = stroke)
        // checkmark
        val a = Offset(center.x - r * 0.42f, center.y)
        val b = Offset(center.x - r * 0.1f, center.y + r * 0.32f)
        val c = Offset(center.x + r * 0.42f, center.y - r * 0.32f)
        drawLine(tint, a, b, strokeWidth = stroke.width, cap = StrokeCap.Round)
        drawLine(tint, b, c, strokeWidth = stroke.width, cap = StrokeCap.Round)
    }
}

@Composable
fun TimerIcon(modifier: Modifier = Modifier, tint: Color = LocalContentColor.current) {
    Canvas(modifier = modifier.size(24.dp)) {
        val stroke = Stroke(width = strokeWidth.toPx(), cap = StrokeCap.Round)
        val r = size.minDimension / 2 * 0.75f
        val center = Offset(size.width / 2, size.height / 2 + size.height * 0.06f)
        drawCircle(color = tint, radius = r, center = center, style = stroke)
        // stem
        drawLine(tint, Offset(center.x, center.y - r), Offset(center.x, center.y - r - size.height * 0.12f), stroke.width, StrokeCap.Round)
        // hand
        drawLine(tint, center, Offset(center.x + r * 0.5f, center.y - r * 0.5f), stroke.width, StrokeCap.Round)
    }
}

@Composable
fun SettingsIcon(modifier: Modifier = Modifier, tint: Color = LocalContentColor.current) {
    Canvas(modifier = modifier.size(24.dp)) {
        val stroke = Stroke(width = strokeWidth.toPx(), cap = StrokeCap.Round)
        val center = Offset(size.width / 2, size.height / 2)
        val outerR = size.minDimension / 2 * 0.78f
        val innerR = outerR * 0.42f
        drawCircle(color = tint, radius = innerR, center = center, style = stroke)
        val teeth = 8
        repeat(teeth) { i ->
            val angle = (2 * Math.PI / teeth * i).toFloat()
            val from = Offset(center.x + outerR * 0.72f * kotlin.math.cos(angle), center.y + outerR * 0.72f * kotlin.math.sin(angle))
            val to = Offset(center.x + outerR * kotlin.math.cos(angle), center.y + outerR * kotlin.math.sin(angle))
            drawLine(tint, from, to, strokeWidth = stroke.width, cap = StrokeCap.Round)
        }
    }
}
