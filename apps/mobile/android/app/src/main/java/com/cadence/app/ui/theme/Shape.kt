package com.cadence.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/** globals.css radii: 12px cards, 8px buttons, 4px small, 9999px pills. */
object CadenceShapes {
    val small = RoundedCornerShape(4.dp)
    val button = RoundedCornerShape(8.dp)
    val card = RoundedCornerShape(12.dp)
    val pill = RoundedCornerShape(percent = 50)
}

val CadenceMaterialShapes = Shapes(
    extraSmall = CadenceShapes.small,
    small = CadenceShapes.button,
    medium = CadenceShapes.card,
    large = CadenceShapes.card,
    extraLarge = CadenceShapes.pill,
)
