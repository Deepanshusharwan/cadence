@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.cadence.app.ui.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.cadence.app.R
import com.cadence.app.data.CadenceRepository
import com.cadence.app.network.dto.CategoryDto
import com.cadence.app.network.dto.EventDto
import com.cadence.app.network.dto.SessionDto
import com.cadence.app.ui.components.CadenceCard
import com.cadence.app.ui.components.CadenceGhostButton
import com.cadence.app.ui.components.CadencePrimaryButton
import com.cadence.app.ui.components.CategoryDot
import com.cadence.app.ui.components.EmptyStateIllustration
import com.cadence.app.ui.components.ToastEffect
import com.cadence.app.ui.theme.CadenceThemeTokens
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

/** Day/Week/Month calendar, mirroring apps/web/src/app/dashboard/calendar/page.tsx's
 * three view modes. */
@Composable
fun CalendarScreen(repository: CadenceRepository) {
    val viewModel: CalendarViewModel = viewModel(
        factory = viewModelFactory { initializer { CalendarViewModel(repository) } },
    )
    val state by viewModel.uiState.collectAsState()
    val colors = CadenceThemeTokens.colors

    ToastEffect(state.errorMessage, viewModel::dismissError)

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Calendar", style = MaterialTheme.typography.headlineSmall, color = colors.inkBlack)
            ViewModeSwitcher(state.viewMode, viewModel::setViewMode)
        }

        when (state.viewMode) {
            CalendarViewMode.DAY -> DayView(state, viewModel)
            CalendarViewMode.WEEK -> WeekView(state, viewModel)
            CalendarViewMode.MONTH -> MonthView(state, viewModel)
        }
    }
}

@Composable
private fun ViewModeSwitcher(current: CalendarViewMode, onSelect: (CalendarViewMode) -> Unit) {
    val colors = CadenceThemeTokens.colors
    Row(
        modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(colors.hairline).padding(2.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        CalendarViewMode.entries.forEach { mode ->
            val selected = mode == current
            Text(
                mode.name.lowercase().replaceFirstChar(Char::uppercase),
                color = if (selected) colors.inkBlack else colors.stone,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = if (selected) FontWeight.Medium else FontWeight.Normal,
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(if (selected) colors.pureWhite else androidx.compose.ui.graphics.Color.Transparent)
                    .clickable { onSelect(mode) }
                    .padding(horizontal = 10.dp, vertical = 6.dp),
            )
        }
    }
}

private fun sessionsOn(sessions: List<SessionDto>, date: LocalDate): List<SessionDto> =
    sessions.filter { it.date == date.toString() }

private fun totalMinutesOn(sessions: List<SessionDto>, date: LocalDate): Int =
    sessionsOn(sessions, date).sumOf { it.durationMinutes }

// --- Day view ----------------------------------------------------------------

@Composable
private fun DayView(state: CalendarUiState, viewModel: CalendarViewModel) {
    val colors = CadenceThemeTokens.colors
    val date = state.anchorDate
    val isToday = date == LocalDate.now()
    val dayType = state.dayTypes[date.toString()] ?: "NORMAL"
    val daySessions = sessionsOn(state.sessions, date)
    val totalMinutes = totalMinutesOn(state.sessions, date)
    var showAddEvent by remember { mutableStateOf(false) }

    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        CadenceGhostButton(text = "← Prev", onClick = { viewModel.navigate(-1) })
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                date.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.getDefault()) + ", " +
                    date.month.getDisplayName(TextStyle.FULL, Locale.getDefault()) + " " + date.dayOfMonth,
                color = colors.inkBlack,
                fontWeight = FontWeight.SemiBold,
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                if (isToday) "Today" else "Jump to today",
                color = colors.accent,
                style = MaterialTheme.typography.bodySmall,
                modifier = if (!isToday) Modifier.clickable(onClick = viewModel::jumpToday) else Modifier,
            )
        }
        CadenceGhostButton(text = "Next →", onClick = { viewModel.navigate(1) })
    }

    Text("DAY TYPE", color = colors.stone, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 8.dp))
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        DAY_TYPE_ORDER.forEach { type ->
            val meta = DAY_TYPE_META.getValue(type)
            val active = dayType == type
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (active) colors.accent else dayTypeBadgeColor(type, colors))
                    .clickable { viewModel.setDayType(date, type) }
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            ) {
                Text(meta.label, color = if (active) colors.pureWhite else colors.inkBlack, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                Text(meta.cost, color = if (active) colors.pureWhite.copy(alpha = 0.8f) else colors.inkBlack.copy(alpha = 0.6f), style = MaterialTheme.typography.labelSmall)
            }
        }
    }

    if (state.dayBlocks.isEmpty() && !state.isRefreshing) {
        CadenceCard {
            EmptyStateIllustration(
                drawableRes = R.drawable.illustration_empty_week,
                title = "Nothing scheduled",
                subtitle = "No fixed blocks for this day.",
            )
        }
    }
    state.dayBlocks.forEach { block ->
        CadenceCard {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text(block.label, color = if (block.dim) colors.stone else colors.inkBlack, fontWeight = if (block.dim) FontWeight.Normal else FontWeight.Medium)
                    Text(block.time, color = colors.stone, style = MaterialTheme.typography.bodySmall)
                }
                if (block.isEvent) Text("Event", color = colors.coral, style = MaterialTheme.typography.bodySmall)
            }
        }
    }

    Text("SESSIONS LOGGED", color = colors.stone, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 8.dp))
    if (daySessions.isEmpty()) {
        Text("Nothing logged for this day yet.", color = colors.stone, style = MaterialTheme.typography.bodySmall)
    } else {
        daySessions.forEach { session -> SessionRow(session, state.categories) }
        Text("${"%.1f".format(totalMinutes / 60.0)}h total", color = colors.stone, fontWeight = FontWeight.Medium, style = MaterialTheme.typography.bodySmall)
    }

    Text("EVENTS", color = colors.stone, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 8.dp))
    val dayEvents = state.events.filter { it.date == date.toString() }.sortedBy { it.start }
    if (dayEvents.isEmpty()) {
        Text("No events planned for this day.", color = colors.stone, style = MaterialTheme.typography.bodySmall)
    } else {
        dayEvents.forEach { event -> EventRow(event, onRemove = { viewModel.deleteEvent(event.id) }) }
    }
    if (showAddEvent) {
        AddEventForm(
            onCancel = { showAddEvent = false },
            onSave = { title, start, end, type ->
                viewModel.addEvent(date, title, start, end, type)
                showAddEvent = false
            },
        )
    } else {
        CadenceGhostButton(text = "+ Add event", onClick = { showAddEvent = true }, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun SessionRow(session: SessionDto, categories: List<CategoryDto>) {
    val colors = CadenceThemeTokens.colors
    val category = categories.firstOrNull { it.id == session.categoryId }
    CadenceCard {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                CategoryDot(category?.color)
                Text(category?.name ?: "Deleted item", color = colors.inkBlack, style = MaterialTheme.typography.bodySmall)
            }
            Text("${session.durationMinutes}m", color = colors.stone, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun EventRow(event: EventDto, onRemove: () -> Unit) {
    val colors = CadenceThemeTokens.colors
    CadenceCard {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(event.title, color = colors.inkBlack, fontWeight = FontWeight.Medium, style = MaterialTheme.typography.bodySmall)
                Text("${event.start}–${event.end} · ${event.type.replace('_', ' ')}", color = colors.stone, style = MaterialTheme.typography.labelSmall)
            }
            Text("Remove", color = colors.coral, style = MaterialTheme.typography.bodySmall, modifier = Modifier.clickable(onClick = onRemove))
        }
    }
}

private val eventTypes = listOf("SCHOOL_OR_WORK", "SOCIAL", "PERSONAL", "TRAVEL", "OTHER")

@Composable
private fun AddEventForm(onCancel: () -> Unit, onSave: (title: String, start: String, end: String, type: String) -> Unit) {
    val colors = CadenceThemeTokens.colors
    var title by remember { mutableStateOf("") }
    var start by remember { mutableStateOf("") }
    var end by remember { mutableStateOf("") }
    var type by remember { mutableStateOf(eventTypes.first()) }

    CadenceCard {
        OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Event title") }, modifier = Modifier.fillMaxWidth())
        Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = start, onValueChange = { start = it }, label = { Text("Start (HH:MM)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = end, onValueChange = { end = it }, label = { Text("End (HH:MM)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f),
            )
        }
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
            items(eventTypes) { t ->
                FilterChip(
                    selected = type == t,
                    onClick = { type = t },
                    label = { Text(t.replace('_', ' ')) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = colors.accent, selectedLabelColor = colors.pureWhite),
                )
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
            CadencePrimaryButton(text = "Save", onClick = { onSave(title, start, end, type) }, enabled = title.isNotBlank() && start.isNotBlank() && end.isNotBlank())
            CadenceGhostButton(text = "Cancel", onClick = onCancel)
        }
    }
}

// --- Week view ---------------------------------------------------------------

@Composable
private fun WeekView(state: CalendarUiState, viewModel: CalendarViewModel) {
    val colors = CadenceThemeTokens.colors
    val weekStart = state.anchorDate.with(java.time.DayOfWeek.MONDAY)
    val days = (0..6).map { weekStart.plusDays(it.toLong()) }
    val hasAnySession = days.any { sessionsOn(state.sessions, it).isNotEmpty() }

    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(
            "${weekStart.month.getDisplayName(TextStyle.SHORT, Locale.getDefault())} ${weekStart.dayOfMonth} – " +
                "${days.last().month.getDisplayName(TextStyle.SHORT, Locale.getDefault())} ${days.last().dayOfMonth}",
            color = colors.stone,
            style = MaterialTheme.typography.bodySmall,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CadenceGhostButton(text = "← Prev", onClick = { viewModel.navigate(-1) })
            CadenceGhostButton(text = "Next →", onClick = { viewModel.navigate(1) })
        }
    }

    if (!hasAnySession) {
        CadenceCard {
            EmptyStateIllustration(
                drawableRes = R.drawable.illustration_empty_week,
                title = "Nothing logged this week",
                subtitle = "Log a session from Today, or tap a day to mark it retroactively.",
            )
        }
    }

    days.forEach { day -> WeekDayCard(day, state, viewModel) }
}

@Composable
private fun WeekDayCard(day: LocalDate, state: CalendarUiState, viewModel: CalendarViewModel) {
    val colors = CadenceThemeTokens.colors
    val isToday = day == LocalDate.now()
    val dayType = state.dayTypes[day.toString()] ?: "NORMAL"
    val daySessions = sessionsOn(state.sessions, day)
    val totalMinutes = totalMinutesOn(state.sessions, day)

    CadenceCard(modifier = if (isToday) Modifier.border(2.dp, colors.accent, RoundedCornerShape(12.dp)) else Modifier) {
        Row(
            modifier = Modifier.fillMaxWidth().clickable { viewModel.selectDay(day) },
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "${day.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault())} ${day.dayOfMonth}",
                color = colors.stone,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
            )
            if (isToday) {
                Text(
                    "Today",
                    color = colors.pureWhite,
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.clip(CircleShape).background(colors.accent).padding(horizontal = 8.dp, vertical = 2.dp),
                )
            }
        }

        Text(
            DAY_TYPE_META.getValue(dayType).label,
            color = colors.inkBlack,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium,
            modifier = Modifier
                .padding(top = 6.dp)
                .clip(CircleShape)
                .background(dayTypeBadgeColor(dayType, colors))
                .clickable { viewModel.cycleDayType(day, dayType) }
                .padding(horizontal = 10.dp, vertical = 4.dp),
        )

        if (daySessions.isEmpty()) {
            Text("Nothing logged", color = colors.stone.copy(alpha = 0.6f), style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 8.dp))
        } else {
            Column(modifier = Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                daySessions.forEach { session ->
                    val category = state.categories.firstOrNull { it.id == session.categoryId }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        CategoryDot(category?.color, modifier = Modifier.size(6.dp))
                        Text(category?.name ?: "Deleted item", color = colors.inkBlack, style = MaterialTheme.typography.labelSmall, modifier = Modifier.weight(1f))
                        Text("${session.durationMinutes}m", color = colors.stone, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
            if (totalMinutes > 0) {
                Text(
                    "${"%.1f".format(totalMinutes / 60.0)}h total",
                    color = colors.stone,
                    fontWeight = FontWeight.Medium,
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }
    }
}

// --- Month view --------------------------------------------------------------

@Composable
private fun MonthView(state: CalendarUiState, viewModel: CalendarViewModel) {
    val colors = CadenceThemeTokens.colors
    val anchor = state.anchorDate
    val firstOfMonth = anchor.withDayOfMonth(1)
    val gridStart = firstOfMonth.minusDays((firstOfMonth.dayOfWeek.value - 1).toLong())
    val cells = (0 until 42).map { gridStart.plusDays(it.toLong()) }

    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(
            "${anchor.month.getDisplayName(TextStyle.FULL, Locale.getDefault())} ${anchor.year}",
            color = colors.inkBlack,
            fontWeight = FontWeight.Medium,
            style = MaterialTheme.typography.bodyMedium,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CadenceGhostButton(text = "← Prev", onClick = { viewModel.navigate(-1) })
            CadenceGhostButton(text = "Next →", onClick = { viewModel.navigate(1) })
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun").forEach { label ->
                Text(
                    label, color = colors.stone, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium,
                    modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }
        cells.chunked(7).forEach { week ->
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                week.forEach { day -> MonthDayCell(day, anchor, state, viewModel, modifier = Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun MonthDayCell(day: LocalDate, monthAnchor: LocalDate, state: CalendarUiState, viewModel: CalendarViewModel, modifier: Modifier = Modifier) {
    val colors = CadenceThemeTokens.colors
    val inMonth = day.month == monthAnchor.month
    val isToday = day == LocalDate.now()
    val dayType = state.dayTypes[day.toString()]
    val totalMinutes = totalMinutesOn(state.sessions, day)
    val dateISO = day.toString()

    Box(
        modifier = modifier
            .aspectRatio(1f)
            .alpha(if (inMonth) 1f else 0.3f)
            .clip(RoundedCornerShape(6.dp))
            .then(if (isToday) Modifier.border(1.dp, colors.accent, RoundedCornerShape(6.dp)) else Modifier)
            .background(if (inMonth) colors.pureWhite else androidx.compose.ui.graphics.Color.Transparent)
            .clickable { viewModel.selectDay(day) },
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(day.dayOfMonth.toString(), color = colors.inkBlack, style = MaterialTheme.typography.labelSmall)
            when {
                dayType != null -> Box(Modifier.padding(top = 2.dp).size(5.dp).clip(CircleShape).background(dayTypeBadgeColor(dayType, colors)))
                totalMinutes > 0 -> Text("${"%.1f".format(totalMinutes / 60.0)}h", color = colors.stone, style = MaterialTheme.typography.labelSmall, fontSize = androidx.compose.ui.unit.TextUnit.Unspecified)
                else -> {}
            }
        }
        if (state.currentStreakDates.contains(dateISO)) {
            Text("🔥", modifier = Modifier.align(Alignment.TopEnd), style = MaterialTheme.typography.labelSmall)
        }
    }
}

private fun dayTypeBadgeColor(type: String, colors: com.cadence.app.ui.theme.CadenceColorTokens) = when (type) {
    "REDUCED" -> colors.skyTint
    "LEAVE" -> colors.marigold
    "MISSED" -> colors.coral.copy(alpha = 0.3f)
    else -> colors.hairline
}
