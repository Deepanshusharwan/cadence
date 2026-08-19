package com.cadence.app.ui.setup

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.cadence.app.data.CadenceRepository
import com.cadence.app.network.dto.AnchorDto
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.ui.components.AnchorForm
import com.cadence.app.ui.components.CadenceCard
import com.cadence.app.ui.components.CadenceGhostButton
import com.cadence.app.ui.components.CadencePrimaryButton
import com.cadence.app.ui.components.ItemForm
import com.cadence.app.ui.theme.CadenceThemeTokens

private val STEP_TITLES = listOf("Identity", "Categories", "Schedule", "Review")

/** Onboarding wizard -- mirrors apps/web/src/app/setup/page.tsx's 4 steps.
 * Shown by CadenceRoot in place of the whole app while `onboarded == false`. */
@Composable
fun SetupScreen(repository: CadenceRepository) {
    val viewModel: SetupViewModel = viewModel(
        factory = viewModelFactory { initializer { SetupViewModel(repository) } },
    )
    val state by viewModel.uiState.collectAsState()
    val colors = CadenceThemeTokens.colors

    // Not wrapped in a Scaffold (unlike CadenceApp), so system-bar insets
    // aren't applied automatically -- without this, the header sits under
    // the status bar icons and the footer under the gesture-nav bar.
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.paperWarmth)
            .windowInsetsPadding(WindowInsets.safeDrawing),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Cadence", style = MaterialTheme.typography.titleMedium, color = colors.inkBlack, fontWeight = FontWeight.Bold)
            Text(
                "Skip for now",
                color = colors.stone,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.clickable(enabled = !state.isFinishing, onClick = viewModel::skip),
            )
        }

        StepIndicator(currentStep = state.step)

        Column(
            modifier = Modifier.fillMaxSize().weight(1f).verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            state.errorMessage?.let { message ->
                CadenceCard(backgroundColor = colors.skyTint) {
                    Text(message, color = colors.accent, style = MaterialTheme.typography.bodySmall)
                }
            }

            when (state.step) {
                0 -> IdentityStep(name = state.name, onNameChange = viewModel::setName)
                1 -> CategoriesStep(viewModel = viewModel, categories = state.categories)
                2 -> ScheduleStep(viewModel = viewModel, anchors = state.anchors)
                else -> ReviewStep(state = state)
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (state.step > 0) {
                CadenceGhostButton(text = "Back", onClick = viewModel::backStep, enabled = !state.isFinishing)
            }
            if (state.step < 3) {
                CadencePrimaryButton(
                    text = "Continue",
                    onClick = viewModel::nextStep,
                    enabled = state.canProceed && !state.isFinishing,
                    modifier = Modifier.fillMaxWidth(),
                )
            } else {
                CadencePrimaryButton(
                    text = if (state.isFinishing) "Finishing…" else "Finish",
                    onClick = viewModel::finish,
                    enabled = !state.isFinishing,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun StepIndicator(currentStep: Int) {
    val colors = CadenceThemeTokens.colors
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        STEP_TITLES.forEachIndexed { index, title ->
            val active = index == currentStep
            val done = index < currentStep
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape),
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        drawCircle(color = if (active || done) colors.accent else colors.stone.copy(alpha = 0.25f))
                    }
                }
                Text(
                    title,
                    color = if (active) colors.inkBlack else colors.stone,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(start = 6.dp),
                )
            }
        }
    }
}

@Composable
private fun IdentityStep(name: String, onNameChange: (String) -> Unit) {
    val colors = CadenceThemeTokens.colors
    Text("What should we call you?", style = MaterialTheme.typography.headlineSmall, color = colors.inkBlack)
    OutlinedTextField(
        value = name,
        onValueChange = onNameChange,
        label = { Text("Your name") },
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun CategoriesStep(viewModel: SetupViewModel, categories: List<CategoryDto>) {
    val colors = CadenceThemeTokens.colors
    Text("What are you working towards?", style = MaterialTheme.typography.headlineSmall, color = colors.inkBlack)
    Text(
        "Add at least one item -- a subject, a habit, a goal. Weekly targets are optional.",
        color = colors.stone,
        style = MaterialTheme.typography.bodySmall,
    )
    categories.forEach { category ->
        CadenceCard {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(category.name, color = colors.inkBlack, fontWeight = FontWeight.Medium)
                Text(
                    "Remove",
                    color = colors.coral,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.clickable { viewModel.removeItem(category.id) },
                )
            }
        }
    }
    ItemForm(onCancel = null, onSave = viewModel::addItem)
}

@Composable
private fun ScheduleStep(viewModel: SetupViewModel, anchors: List<AnchorDto>) {
    val colors = CadenceThemeTokens.colors
    Text("Set your fixed times", style = MaterialTheme.typography.headlineSmall, color = colors.inkBlack)
    Text(
        "Work, class, a recurring commitment -- anything Cadence should plan around. Optional; add more anytime from Settings.",
        color = colors.stone,
        style = MaterialTheme.typography.bodySmall,
    )
    anchors.forEach { anchor ->
        CadenceCard {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(anchor.label, color = colors.inkBlack, fontWeight = FontWeight.Medium)
                Text(
                    "Remove",
                    color = colors.coral,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.clickable { viewModel.removeAnchor(anchor.id) },
                )
            }
        }
    }
    AnchorForm(onCancel = null, onSave = viewModel::addAnchor)
}

@Composable
private fun ReviewStep(state: SetupUiState) {
    val colors = CadenceThemeTokens.colors
    Text("You're all set", style = MaterialTheme.typography.headlineSmall, color = colors.inkBlack)
    CadenceCard {
        Text("Name: ${state.name.ifBlank { "there" }}", color = colors.inkBlack)
        Text("${state.categories.size} item(s)", color = colors.inkBlack)
        Text("${state.anchors.size} fixed time(s)", color = colors.inkBlack)
    }
    Text(
        "You can change any of this later from Settings.",
        color = colors.stone,
        style = MaterialTheme.typography.bodySmall,
    )
}
