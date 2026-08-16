@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package de.kornelriedl.deggendorfstadtbus.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.kornelriedl.deggendorfstadtbus.data.api.ApiOutcome
import de.kornelriedl.deggendorfstadtbus.data.api.ScheduleApi
import de.kornelriedl.deggendorfstadtbus.data.model.Journey
import de.kornelriedl.deggendorfstadtbus.data.model.RouteData
import de.kornelriedl.deggendorfstadtbus.data.model.StopData
import de.kornelriedl.deggendorfstadtbus.ui.Loadable
import de.kornelriedl.deggendorfstadtbus.ui.components.JourneyCard
import de.kornelriedl.deggendorfstadtbus.ui.components.StopAutocomplete
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Verbindungssuche - Kotlin-Pendant zu RoutePlanner.tsx, layout-/farblich bewusst nah an der
 * Web-App gehalten (Karten-Formular mit Label-über-Feld-Haltestellensuche, Datum/Uhrzeit
 * nebeneinander, Ergebnisliste mit Segment-Balken-JourneyCard) statt eines rein
 * Material-typischen Looks.
 */
@Composable
fun RoutePlannerScreen(
    modifier: Modifier = Modifier,
    stops: Loadable<List<StopData>>,
    routesById: Map<String, RouteData>
) {
    var originId by remember { mutableStateOf<String?>(null) }
    var originQuery by remember { mutableStateOf("") }
    var destId by remember { mutableStateOf<String?>(null) }
    var destQuery by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<Loadable<List<Journey>>?>(null) }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    var selectedTime by remember { mutableStateOf(LocalTime.now().withSecond(0).withNano(0)) }
    var pickingDate by remember { mutableStateOf(false) }
    var pickingTime by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val sameStop = originId != null && destId != null && originId == destId

    fun search() {
        val from = originId ?: return
        val to = destId ?: return
        results = Loadable.Loading
        val dateStr = selectedDate.format(DateTimeFormatter.ISO_LOCAL_DATE)
        val afterMin = selectedTime.hour * 60 + selectedTime.minute
        scope.launch(Dispatchers.IO) {
            results = when (val r = ScheduleApi.journeys(from, to, dateStr, afterMin)) {
                is ApiOutcome.Success -> Loadable.Ready(r.data)
                is ApiOutcome.Failure -> Loadable.Error(r.message)
            }
        }
    }

    Column(modifier = modifier.fillMaxSize().padding(16.dp)) {
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                StopAutocomplete(
                    label = "Von",
                    query = originQuery,
                    onQueryChange = {
                        originQuery = it
                        originId = null
                    },
                    onSelect = { stop ->
                        originId = stop.id
                        originQuery = stop.name
                    },
                    modifier = Modifier.fillMaxWidth()
                )

                Box(
                    modifier = Modifier
                        .align(Alignment.CenterHorizontally)
                        .size(36.dp)
                        .background(MaterialTheme.colorScheme.surface, CircleShape)
                        .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                        .clickable {
                            val tmpId = originId
                            val tmpQuery = originQuery
                            originId = destId
                            originQuery = destQuery
                            destId = tmpId
                            destQuery = tmpQuery
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Filled.SwapVert,
                        contentDescription = "Start und Ziel tauschen",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                }

                StopAutocomplete(
                    label = "Nach",
                    query = destQuery,
                    onQueryChange = {
                        destQuery = it
                        destId = null
                    },
                    onSelect = { stop ->
                        destId = stop.id
                        destQuery = stop.name
                    },
                    modifier = Modifier.fillMaxWidth()
                )

                Row(horizontalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.fillMaxWidth()) {
                    LabeledField(
                        label = "Datum",
                        value = selectedDate.format(DateTimeFormatter.ofPattern("dd.MM.yyyy")),
                        onClick = { pickingDate = true },
                        modifier = Modifier.weight(1f)
                    )
                    LabeledField(
                        label = "Ab Uhrzeit",
                        value = selectedTime.format(DateTimeFormatter.ofPattern("HH:mm")),
                        onClick = { pickingTime = true },
                        modifier = Modifier.weight(1f)
                    )
                }

                Button(
                    onClick = { search() },
                    enabled = originId != null && destId != null && !sameStop,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.padding(top = 2.dp)
                ) {
                    Text("Verbindung suchen", fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold)
                }
                if (sameStop) {
                    Text(
                        "Start und Ziel dürfen nicht gleich sein.",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }

        when (val r = results) {
            null -> {}
            is Loadable.Loading -> CircularProgressIndicator(modifier = Modifier.padding(top = 16.dp))
            is Loadable.Error -> Text("Fehler: ${r.message}", modifier = Modifier.padding(top = 16.dp))
            is Loadable.Ready -> if (r.data.isEmpty()) {
                Text(
                    "Keine Verbindung gefunden (an diesem Tag/zu dieser Zeit kein Verkehr, oder keine " +
                        "Verbindung mit höchstens einmal Umsteigen).",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(top = 16.dp)
                )
            } else {
                LazyColumn(contentPadding = PaddingValues(vertical = 12.dp)) {
                    items(r.data) { journey -> JourneyCard(journey, routesById) }
                }
            }
        }
    }

    if (pickingDate) {
        val state = rememberDatePickerState(
            // Material3 DatePicker rechnet intern grundsätzlich in UTC-Millis (unabhängig von
            // der Systemzeitzone) - mit der lokalen Zone gebaute Millis verschieben das
            // angezeigte Datum um einen Tag (in MEZ/MESZ rückwärts).
            initialSelectedDateMillis = selectedDate.atStartOfDay(ZoneId.of("UTC")).toInstant().toEpochMilli()
        )
        DatePickerDialog(
            onDismissRequest = { pickingDate = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { millis ->
                        selectedDate = Instant.ofEpochMilli(millis).atZone(ZoneId.of("UTC")).toLocalDate()
                    }
                    pickingDate = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickingDate = false }) { Text("Abbrechen") } }
        ) {
            DatePicker(state = state)
        }
    }

    if (pickingTime) {
        val state = rememberTimePickerState(initialHour = selectedTime.hour, initialMinute = selectedTime.minute, is24Hour = true)
        AlertDialog(
            onDismissRequest = { pickingTime = false },
            confirmButton = {
                TextButton(onClick = {
                    selectedTime = LocalTime.of(state.hour, state.minute)
                    pickingTime = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickingTime = false }) { Text("Abbrechen") } },
            text = { TimePicker(state = state) }
        )
    }
}

@Composable
private fun LabeledField(label: String, value: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(10.dp))
                .clickable(onClick = onClick)
                .padding(horizontal = 12.dp, vertical = 12.dp)
        ) {
            Text(value)
        }
    }
}
