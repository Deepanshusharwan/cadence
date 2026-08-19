package com.cadence.app.ui.theme

import androidx.compose.ui.graphics.Color

/** Resolves a category's stored `color` (one of
 * backend/app/routers/categories.py's ACCENT_CLASSES Tailwind class names,
 * e.g. "bg-marigold") to an actual Color -- mirrors
 * apps/web/src/lib/category-color.ts's palette exactly, including the
 * legacy "bg-midnight-ink" value (excluded from new rotation server-side
 * but still readable on older categories). */
fun categoryColorFor(colorClass: String?): Color = when (colorClass) {
    "bg-marigold" -> CadenceColors.marigold
    "bg-terracotta" -> CadenceColors.terracotta
    "bg-signal-blue" -> CadenceColors.signalBlue
    "bg-sky-wash" -> CadenceColors.skyWash
    "bg-orchid" -> CadenceColors.orchid
    "bg-midnight-ink" -> CadenceColors.midnightInk
    "bg-coral" -> CadenceColors.coral
    else -> CadenceColors.notionBlue
}
