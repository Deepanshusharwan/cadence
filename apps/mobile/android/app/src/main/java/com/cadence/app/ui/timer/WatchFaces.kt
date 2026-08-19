package com.cadence.app.ui.timer

import android.graphics.Paint
import android.graphics.Typeface
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.cadence.app.ui.theme.CadenceThemeTokens
import kotlin.math.cos
import kotlin.math.sin

/** Mirrors apps/web's WATCH_FACES order/labels exactly (see
 * apps/web/src/app/dashboard/page.tsx). Free users always get
 * "chronograph"; the rest are Plus-gated (see TimerScreen's picker). */
data class WatchFaceOption(val key: String, val label: String)

val WATCH_FACE_OPTIONS = listOf(
    WatchFaceOption("chronograph", "Chronograph"),
    WatchFaceOption("retro", "Retro"),
    WatchFaceOption("progress-ring", "Progress Ring"),
    WatchFaceOption("sundial", "Sundial"),
    WatchFaceOption("pip-ring", "Pip Ring"),
    WatchFaceOption("8bit", "8-Bit"),
    WatchFaceOption("heritage", "Heritage"),
    WatchFaceOption("brand", "Cadence"),
)

fun cycleWatchFace(current: String, delta: Int): String {
    val index = WATCH_FACE_OPTIONS.indexOfFirst { it.key == current }.coerceAtLeast(0)
    val next = (index + delta + WATCH_FACE_OPTIONS.size) % WATCH_FACE_OPTIONS.size
    return WATCH_FACE_OPTIONS[next].key
}

fun formatElapsed(totalSeconds: Int): String {
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%02d:%02d".format(minutes, seconds)
}

/** Dispatches to one of the 8 illustrated faces ported from the web
 * dashboard's timer components (apps/web/src/components, e.g.
 * analog-timer.tsx). All are driven off the same
 * unbounded stopwatch model as [TimerViewModel] (no fixed target/duration):
 * an "hourDeg" that wraps every 60 real minutes for the slow hand/fill, and
 * a "secDeg" that wraps every 60 real seconds for the fast hand -- not a
 * literal reproduction of every doodle in the web version (sub-dial swing
 * animations, cat/plant doodles, checkerboard LCD texture are simplified),
 * but faithful to each design's core shape/color/motion. */
@Composable
fun WatchFace(
    key: String,
    elapsedSeconds: Int,
    running: Boolean,
    itemLabel: String,
    size: Dp,
    modifier: Modifier = Modifier,
    onSwipeNext: (() -> Unit)? = null,
    onSwipePrevious: (() -> Unit)? = null,
) {
    val alpha = if (running) 1f else 0.4f
    var dragTotal by remember { mutableStateOf(0f) }
    val swipeModifier = if (onSwipeNext != null && onSwipePrevious != null) {
        Modifier.pointerInput(onSwipeNext, onSwipePrevious) {
            detectHorizontalDragGestures(
                onDragStart = { dragTotal = 0f },
                onHorizontalDrag = { _, delta -> dragTotal += delta },
                onDragEnd = {
                    if (dragTotal <= -80f) onSwipeNext() else if (dragTotal >= 80f) onSwipePrevious()
                },
            )
        }
    } else {
        Modifier
    }
    Box(modifier = modifier.alpha(alpha).then(swipeModifier), contentAlignment = Alignment.Center) {
        when (key) {
            "retro" -> RetroFace(elapsedSeconds, itemLabel, size)
            "progress-ring" -> ProgressRingFace(elapsedSeconds, itemLabel, size)
            "sundial" -> SundialFace(elapsedSeconds, itemLabel, size)
            "pip-ring" -> PipRingFace(elapsedSeconds, itemLabel, size)
            "8bit" -> EightBitFace(elapsedSeconds, itemLabel, size)
            "heritage" -> HeritageFace(elapsedSeconds, itemLabel, size)
            "brand" -> BrandFace(elapsedSeconds, itemLabel, size)
            else -> ChronographFace(elapsedSeconds, itemLabel, size)
        }
    }
}

private fun DrawScope.drawText(text: String, center: Offset, color: Color, textSizePx: Float, bold: Boolean = false) {
    drawContext.canvas.nativeCanvas.drawText(
        text,
        center.x,
        center.y + textSizePx * 0.35f,
        Paint().apply {
            this.color = color.toArgb()
            textSize = textSizePx
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
            typeface = Typeface.create(Typeface.DEFAULT, if (bold) Typeface.BOLD else Typeface.NORMAL)
        },
    )
}

private fun androidx.compose.ui.graphics.Color.toArgb(): Int =
    android.graphics.Color.argb((alpha * 255).toInt(), (red * 255).toInt(), (green * 255).toInt(), (blue * 255).toInt())

private fun pointOnCircle(center: Offset, radius: Float, degrees: Float): Offset {
    val rad = Math.toRadians((degrees - 90).toDouble())
    return Offset(center.x + radius * cos(rad).toFloat(), center.y + radius * sin(rad).toFloat())
}

// --- 1. Chronograph (apps/web/src/components/analog-timer.tsx) -------------

@Composable
private fun ChronographFace(elapsedSeconds: Int, itemLabel: String, size: Dp) {
    val colors = CadenceThemeTokens.colors
    val hourDeg = ((elapsedSeconds % 3600) / 3600f) * 360f
    val secDeg = (elapsedSeconds % 60) * 6f

    androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
    Canvas(Modifier.size(size)) {
        val center = Offset(this.size.width / 2, this.size.height / 2)
        val radius = this.size.minDimension / 2 * 0.9f

        drawCircle(colors.pureWhite, radius, center)
        drawCircle(colors.inkBlack.copy(alpha = 0.15f), radius, center, style = Stroke(2f))

        for (i in 0 until 60) {
            val deg = i * 6f
            val major = i % 5 == 0
            val outer = pointOnCircle(center, radius * 0.95f, deg)
            val inner = pointOnCircle(center, radius * (if (major) 0.85f else 0.9f), deg)
            drawLine(colors.inkBlack.copy(alpha = if (major) 0.6f else 0.25f), inner, outer, strokeWidth = if (major) 3f else 1.5f)
        }

        val numeralRadius = radius * 0.72f
        listOf(12 to 12, 1 to 1, 2 to 2, 4 to 4, 5 to 5, 6 to 6, 7 to 7, 8 to 8, 10 to 10, 11 to 11).forEach { (hour, label) ->
            val deg = hour * 30f
            drawText(label.toString(), pointOnCircle(center, numeralRadius, deg), colors.inkBlack.copy(alpha = 0.7f), radius * 0.14f)
        }

        // Sub-dials at 9 (seconds, live) and 3 (decorative) o'clock.
        val subRadius = radius * 0.22f
        val secCenter = pointOnCircle(center, radius * 0.5f, 270f)
        val decoCenter = pointOnCircle(center, radius * 0.5f, 90f)
        listOf(secCenter, decoCenter).forEach { sub ->
            drawCircle(colors.paperWarmth, subRadius, sub)
            drawCircle(colors.inkBlack.copy(alpha = 0.2f), subRadius, sub, style = Stroke(1.5f))
        }
        drawLine(colors.coral, secCenter, pointOnCircle(secCenter, subRadius * 0.8f, secDeg), strokeWidth = 2f, cap = StrokeCap.Round)
        drawLine(colors.signalBlue, decoCenter, pointOnCircle(decoCenter, subRadius * 0.8f, hourDeg * 3f % 360f), strokeWidth = 2f, cap = StrokeCap.Round)

        drawLine(colors.accent, center, pointOnCircle(center, radius * 0.55f, hourDeg), strokeWidth = 4f, cap = StrokeCap.Round)
        drawCircle(colors.accent, 5f, center)
    }
    FaceLabel(formatElapsed(elapsedSeconds), itemLabel)
    }
}

// --- 2. Retro (apps/web/src/components/retro-timer.tsx) --------------------

@Composable
private fun RetroFace(elapsedSeconds: Int, itemLabel: String, size: Dp) {
    val caseColor = Color(0xFFA69D97)
    val faceColor = Color(0xFFDCCFC8)
    val handColor = Color(0xFF2E2A28)
    val accentColor = CadenceThemeTokens.colors.accent
    val hourDeg = ((elapsedSeconds % 3600) / 3600f) * 360f

    androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
    Canvas(Modifier.size(size)) {
        val center = Offset(this.size.width / 2, this.size.height / 2)
        val caseRadius = this.size.minDimension / 2 * 0.92f
        val faceRadius = caseRadius * 0.82f

        // Two crown nubs.
        drawCircle(caseColor, 8f, Offset(center.x - caseRadius * 0.75f, center.y - caseRadius * 0.98f))
        drawCircle(caseColor, 8f, Offset(center.x + caseRadius * 0.75f, center.y - caseRadius * 0.98f))

        drawCircle(caseColor, caseRadius, center)
        drawCircle(faceColor, faceRadius, center)

        listOf(0f, 90f, 180f, 270f).forEach { deg ->
            drawLine(handColor.copy(alpha = 0.5f), pointOnCircle(center, faceRadius * 0.9f, deg), pointOnCircle(center, faceRadius * 0.78f, deg), strokeWidth = 3f)
        }

        drawLine(handColor, center, pointOnCircle(center, faceRadius * 0.6f, hourDeg), strokeWidth = 5f, cap = StrokeCap.Round)
        drawCircle(accentColor, 4f, pointOnCircle(center, faceRadius * 0.55f, hourDeg + 180f))
        drawCircle(handColor, 4f, center)
    }
    FaceLabel(formatElapsed(elapsedSeconds), itemLabel)
    }
}

// --- 3. Progress Ring (apps/web/src/components/progress-ring-timer.tsx) ----

@Composable
private fun ProgressRingFace(elapsedSeconds: Int, itemLabel: String, size: Dp) {
    val colors = CadenceThemeTokens.colors
    val hourDeg = ((elapsedSeconds % 3600) / 3600f) * 360f
    // No weekly-target plumbing on the Timer screen (its stopwatch has no
    // fixed target) -- filled dots track the current hour's progress
    // instead of a weekly percentage, a documented simplification of web's
    // progressPct.
    val fillFraction = hourDeg / 360f

    androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
    Canvas(Modifier.size(size)) {
        val center = Offset(this.size.width / 2, this.size.height / 2)
        val radius = this.size.minDimension / 2 * 0.95f
        val dotCount = 40

        for (i in 0 until dotCount) {
            val deg = i * (360f / dotCount)
            val filled = (i.toFloat() / dotCount) < fillFraction
            drawCircle(if (filled) colors.signalBlue else colors.inkBlack.copy(alpha = 0.15f), 3.5f, pointOnCircle(center, radius, deg))
        }

        val faceRadius = radius * 0.82f
        drawCircle(colors.pureWhite, faceRadius, center)
        for (hour in 1..12) {
            val deg = hour * 30f
            drawText(hour.toString(), pointOnCircle(center, faceRadius * 0.75f, deg), colors.inkBlack.copy(alpha = 0.6f), radius * 0.11f)
        }
        drawLine(colors.inkBlack, center, pointOnCircle(center, faceRadius * 0.55f, hourDeg), strokeWidth = 4f, cap = StrokeCap.Round)
        drawCircle(colors.accent, 5f, center)
    }
    FaceLabel(formatElapsed(elapsedSeconds), itemLabel)
    }
}

// --- 4. Sundial (apps/web/src/components/sundial-timer.tsx) ----------------

@Composable
private fun SundialFace(elapsedSeconds: Int, itemLabel: String, size: Dp) {
    val gold = Color(0xFFB8860B)
    val brown = Color(0xFF6B4A2A)
    val parchment = Color(0xFFE8D9B5)
    val hourDeg = ((elapsedSeconds % 3600) / 3600f) * 360f

    androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
    Canvas(Modifier.size(size)) {
        val center = Offset(this.size.width / 2, this.size.height / 2)
        val radius = this.size.minDimension / 2 * 0.92f

        drawCircle(
            brush = Brush.radialGradient(listOf(parchment, parchment.copy(alpha = 0.7f)), center = center, radius = radius),
            radius = radius,
            center = center,
        )
        drawCircle(gold, radius, center, style = Stroke(2f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 6f))))

        listOf(45f, 135f, 225f, 315f).forEach { deg ->
            drawCircle(brown.copy(alpha = 0.15f), radius * 0.06f, pointOnCircle(center, radius * 0.65f, deg))
        }

        for (hour in 1..12) {
            val deg = hour * 30f
            drawText(hour.toString(), pointOnCircle(center, radius * 0.78f, deg), brown.copy(alpha = 0.7f), radius * 0.1f)
        }

        // Sun-face at center.
        drawCircle(gold, radius * 0.16f, center)
        drawCircle(brown, 2.5f, Offset(center.x - radius * 0.05f, center.y - radius * 0.03f))
        drawCircle(brown, 2.5f, Offset(center.x + radius * 0.05f, center.y - radius * 0.03f))

        // Tapered shadow hand.
        val tip = pointOnCircle(center, radius * 0.6f, hourDeg)
        val baseA = pointOnCircle(center, radius * 0.04f, hourDeg + 90f)
        val baseB = pointOnCircle(center, radius * 0.04f, hourDeg - 90f)
        drawPath(
            androidx.compose.ui.graphics.Path().apply {
                moveTo(tip.x, tip.y)
                lineTo(baseA.x, baseA.y)
                lineTo(baseB.x, baseB.y)
                close()
            },
            color = brown.copy(alpha = 0.55f),
        )
    }
    FaceLabel(formatElapsed(elapsedSeconds), "❦ $itemLabel ❦")
    }
}

// --- 5. Pip Ring (apps/web/src/components/pip-ring-timer.tsx) --------------

@Composable
private fun PipRingFace(elapsedSeconds: Int, itemLabel: String, size: Dp) {
    val colors = CadenceThemeTokens.colors
    val hourDeg = ((elapsedSeconds % 3600) / 3600f) * 360f
    val fillFraction = hourDeg / 360f

    androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
    Canvas(Modifier.size(size)) {
        val center = Offset(this.size.width / 2, this.size.height / 2)
        val radius = this.size.minDimension / 2 * 0.95f
        val pipCount = 32

        for (i in 0 until pipCount) {
            val deg = i * (360f / pipCount)
            val filled = (i.toFloat() / pipCount) < fillFraction
            val point = pointOnCircle(center, radius, deg)
            if (filled) {
                drawCircle(colors.inkBlack, 4f, point)
            } else {
                drawCircle(colors.inkBlack.copy(alpha = 0.3f), 4f, point, style = Stroke(1.5f))
            }
        }
        drawText(formatElapsed(elapsedSeconds), center, colors.inkBlack, radius * 0.28f, bold = true)
    }
    FaceLabel(null, itemLabel)
    }
}

// --- 6. 8-Bit (apps/web/src/components/eight-bit-timer.tsx) ----------------

@Composable
private fun EightBitFace(elapsedSeconds: Int, itemLabel: String, size: Dp) {
    val lcdDark = Color(0xFF2E3320)
    val lcdLight = Color(0xFF8A9670)

    Canvas(Modifier.size(size)) {
        val w = this.size.width
        val h = this.size.height
        val cell = w / 12f
        for (row in 0 until (h / cell).toInt() + 1) {
            for (col in 0 until 12) {
                val dark = (row + col) % 2 == 0
                drawRect(if (dark) lcdDark.copy(alpha = 0.08f) else lcdLight.copy(alpha = 0.08f), topLeft = Offset(col * cell, row * cell), size = androidx.compose.ui.geometry.Size(cell, cell))
            }
        }
        drawRect(lcdLight.copy(alpha = 0.25f), style = Stroke(3f))

        // Elapsed-minute flame counter (documented stand-in for web's true
        // streak prop, which the Timer screen -- a plain stopwatch -- has
        // no plumbing for).
        drawText("◆◆◆★◆◆◆", Offset(w / 2, h * 0.22f), lcdDark, w * 0.06f)
        drawText(formatElapsed(elapsedSeconds), Offset(w / 2, h * 0.55f), lcdDark, w * 0.16f, bold = true)
        drawText(itemLabel.uppercase(), Offset(w / 2, h * 0.78f), lcdDark, w * 0.055f, bold = true)
    }
}

// --- 7. Heritage (apps/web/src/components/heritage-timer.tsx) --------------

private val ROMAN_NUMERALS = listOf("XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI")

@Composable
private fun HeritageFace(elapsedSeconds: Int, itemLabel: String, size: Dp) {
    val navy = Color(0xFF0B1230)
    val gold = Color(0xFFD4AF37)
    val hourDeg = ((elapsedSeconds % 3600) / 3600f) * 360f
    val minDeg = (elapsedSeconds % 60) * 6f

    androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
    Canvas(Modifier.size(size)) {
        val center = Offset(this.size.width / 2, this.size.height / 2)
        val radius = this.size.minDimension / 2 * 0.92f

        drawCircle(navy, radius, center)
        for (i in 0 until 72) {
            val deg = i * 5f
            drawLine(gold.copy(alpha = 0.08f), center, pointOnCircle(center, radius, deg), strokeWidth = 1f)
        }
        for (i in 0 until 60) {
            val deg = i * 6f
            val major = i % 5 == 0
            drawLine(gold.copy(alpha = if (major) 0.9f else 0.4f), pointOnCircle(center, radius * 0.92f, deg), pointOnCircle(center, radius * (if (major) 0.82f else 0.88f), deg), strokeWidth = if (major) 2.5f else 1f)
        }
        for (hour in 0 until 12) {
            val deg = hour * 30f
            drawText(ROMAN_NUMERALS[hour], pointOnCircle(center, radius * 0.68f, deg), gold, radius * 0.1f)
        }

        // Date window.
        val windowCenter = pointOnCircle(center, radius * 0.55f, 90f)
        drawRect(Color.White.copy(alpha = 0.9f), topLeft = Offset(windowCenter.x - radius * 0.16f, windowCenter.y - radius * 0.06f), size = androidx.compose.ui.geometry.Size(radius * 0.32f, radius * 0.12f))
        drawText(formatElapsed(elapsedSeconds), windowCenter, navy, radius * 0.08f, bold = true)

        drawLine(gold, center, pointOnCircle(center, radius * 0.5f, hourDeg), strokeWidth = 4f, cap = StrokeCap.Round)
        drawLine(gold, center, pointOnCircle(center, radius * 0.68f, minDeg), strokeWidth = 2.5f, cap = StrokeCap.Round)
        drawCircle(gold, 4f, center)
        drawCircle(gold, radius * 0.03f, pointOnCircle(center, radius * 0.98f, 0f))
    }
    FaceLabel(null, itemLabel, textColor = navy)
    }
}

// --- 8. Brand / Cadence (apps/web/src/components/brand-timer.tsx) ----------

@Composable
private fun BrandFace(elapsedSeconds: Int, itemLabel: String, size: Dp) {
    val colors = CadenceThemeTokens.colors
    val hourDeg = ((elapsedSeconds % 3600) / 3600f) * 360f
    val secDeg = (elapsedSeconds % 60) * 6f
    val palette = listOf(colors.coral, colors.marigold, colors.signalBlue, com.cadence.app.ui.theme.CadenceColors.orchid, colors.skyWash, com.cadence.app.ui.theme.CadenceColors.terracotta)

    androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
    Canvas(Modifier.size(size)) {
        val center = Offset(this.size.width / 2, this.size.height / 2)
        val radius = this.size.minDimension / 2 * 0.92f

        drawCircle(colors.pureWhite, radius, center)
        for (i in 0 until 12) {
            val deg = i * 30f
            drawLine(palette[i % palette.size], pointOnCircle(center, radius * 0.95f, deg), pointOnCircle(center, radius * 0.85f, deg), strokeWidth = 3.5f, cap = StrokeCap.Round)
        }
        for (i in 0 until 4) {
            val startDeg = i * 90f + 10f
            drawArc(
                color = palette[i % palette.size].copy(alpha = 0.25f),
                startAngle = startDeg - 90f,
                sweepAngle = 20f,
                useCenter = false,
                topLeft = Offset(center.x - radius * 0.78f, center.y - radius * 0.78f),
                size = androidx.compose.ui.geometry.Size(radius * 1.56f, radius * 1.56f),
                style = Stroke(6f, cap = StrokeCap.Round),
            )
        }

        // Cadence "C"-mark, given a face.
        val markRadius = radius * 0.3f
        drawArc(
            color = colors.inkBlack,
            startAngle = 40f,
            sweepAngle = 280f,
            useCenter = false,
            topLeft = Offset(center.x - markRadius, center.y - markRadius),
            size = androidx.compose.ui.geometry.Size(markRadius * 2, markRadius * 2),
            style = Stroke(5f, cap = StrokeCap.Round),
        )
        drawCircle(colors.inkBlack, 2.5f, Offset(center.x - markRadius * 0.35f, center.y - markRadius * 0.15f))
        drawCircle(colors.inkBlack, 2.5f, Offset(center.x + markRadius * 0.35f, center.y - markRadius * 0.15f))

        // Two small doodles near the base.
        drawCircle(colors.marigold.copy(alpha = 0.6f), radius * 0.06f, Offset(center.x - radius * 0.55f, center.y + radius * 0.7f))
        drawCircle(colors.stone.copy(alpha = 0.4f), radius * 0.05f, Offset(center.x + radius * 0.55f, center.y + radius * 0.72f))

        drawLine(colors.inkBlack, center, pointOnCircle(center, radius * 0.55f, hourDeg), strokeWidth = 4f, cap = StrokeCap.Round)
        drawLine(colors.coral, center, pointOnCircle(center, radius * 0.7f, secDeg), strokeWidth = 2f, cap = StrokeCap.Round)
    }
    FaceLabel(null, itemLabel)
    }
}

@Composable
private fun FaceLabel(timeLabel: String?, itemLabel: String, textColor: Color? = null) {
    val colors = CadenceThemeTokens.colors
    val color = textColor ?: colors.stone
    androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        timeLabel?.let {
            androidx.compose.material3.Text(it, color = color, style = androidx.compose.material3.MaterialTheme.typography.bodySmall)
        }
        androidx.compose.material3.Text(itemLabel, color = color, style = androidx.compose.material3.MaterialTheme.typography.bodySmall)
    }
}
