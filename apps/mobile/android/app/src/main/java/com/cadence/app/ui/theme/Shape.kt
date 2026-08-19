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

/** `extraLarge` deliberately stays a card radius, not [CadenceShapes.pill] --
 * Material3 defaults dialogs/bottom sheets (AlertDialog, ModalBottomSheet,
 * DatePicker, ...) to `shapes.extraLarge`, and a 50%-rounded pill on a
 * roughly-square container renders as a circle, clipping their content.
 * Nothing in this app reaches for `MaterialTheme.shapes.extraLarge`
 * expecting a pill -- components that actually want one use
 * [CadenceShapes.pill] directly (see ui/components/CadenceButton.kt). */
val CadenceMaterialShapes = Shapes(
    extraSmall = CadenceShapes.small,
    small = CadenceShapes.button,
    medium = CadenceShapes.card,
    large = CadenceShapes.card,
    extraLarge = CadenceShapes.card,
)
