package com.cadence.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.cadence.app.ui.theme.CadenceHairlineWidth
import com.cadence.app.ui.theme.CadenceShapes
import com.cadence.app.ui.theme.CadenceThemeTokens

/** White surface, 12dp radius, 1px hairline border, no shadow -- the one
 * card shape the whole app uses, per the notion-web-design skill's "White
 * Feature Card" spec ("Do not add shadows to content cards"). Pass
 * [backgroundColor] for the rare accent-tinted variant (e.g. an inline
 * error notice) -- the hairline border is dropped in that case since a
 * tinted fill already separates it from the canvas. */
@Composable
fun CadenceCard(
    modifier: Modifier = Modifier,
    backgroundColor: Color? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = CadenceThemeTokens.colors
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = CadenceShapes.card,
        colors = CardDefaults.cardColors(containerColor = backgroundColor ?: colors.pureWhite),
        border = if (backgroundColor == null) BorderStroke(CadenceHairlineWidth, colors.hairline) else null,
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp), content = content)
    }
}
