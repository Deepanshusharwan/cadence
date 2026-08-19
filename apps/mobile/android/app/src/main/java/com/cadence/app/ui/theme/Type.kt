package com.cadence.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Ports apps/web/src/app/globals.css's type scale (--text-caption through
 * --text-display-lg) 1:1, including the documented negative letter-spacing
 * at large sizes. `Inter` is the system-safe default here rather than
 * bundling the variable font -- close enough to the web app's `next/font`
 * Inter for a native app (no exact NotionInter substitute either way, per
 * the notion-web-design skill's own "Substitute: Inter" note).
 */
object CadenceType {
    val caption = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, letterSpacing = 0.12.sp)
    val bodySmall = TextStyle(fontSize = 14.sp, lineHeight = 20.sp)
    val body = TextStyle(fontSize = 16.sp, lineHeight = 24.sp)
    val subheading = TextStyle(fontSize = 20.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium)
    val headingSm = TextStyle(
        fontSize = 22.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.242).sp,
        fontWeight = FontWeight.SemiBold,
    )
    val heading = TextStyle(fontSize = 32.sp, lineHeight = 38.sp, fontWeight = FontWeight.SemiBold)
    val headingLg = TextStyle(fontSize = 40.sp, lineHeight = 46.sp, fontWeight = FontWeight.Bold)
    val displaySm = TextStyle(
        fontSize = 44.sp,
        lineHeight = 46.sp,
        letterSpacing = (-1.89).sp,
        fontWeight = FontWeight.Bold,
    )
}

fun cadenceMaterialTypography(): Typography {
    val base = Typography()
    return base.copy(
        bodyLarge = base.bodyLarge.merge(CadenceType.body),
        bodyMedium = base.bodyMedium.merge(CadenceType.bodySmall),
        bodySmall = base.bodySmall.merge(CadenceType.caption),
        titleLarge = base.titleLarge.merge(CadenceType.headingSm),
        titleMedium = base.titleMedium.merge(CadenceType.subheading),
        headlineSmall = base.headlineSmall.merge(CadenceType.heading),
        headlineLarge = base.headlineLarge.merge(CadenceType.headingLg),
        displaySmall = base.displaySmall.merge(CadenceType.displaySm),
        labelLarge = base.labelLarge.merge(CadenceType.bodySmall.copy(fontWeight = FontWeight.Medium)),
    )
}
