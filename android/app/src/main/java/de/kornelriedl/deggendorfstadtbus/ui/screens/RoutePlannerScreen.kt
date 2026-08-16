@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package de.kornelriedl.deggendorfstadtbus.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.kornelriedl.deggendorfstadtbus.data.api.ApiOutcome
import de.kornelriedl.deggendorfstadtbus.data.api.ScheduleApi
import de.kornelriedl.deggendorfstadtbus.data.model.Journey
import de.kornelriedl.deggendorfstadtbus.data.model.RouteData
import de.kornelriedl.deggendorfstadtbus.data.model.StopData
import de.kornelriedl.deggendorfstadtbus.ui.Loadable
import de.kornelriedl.deggendorfstadtbus.ui.components.JourneyCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun RoutePlannerScreen(
    modifier: Modifier = Modifier,
    stops: Loadable<List<StopData>>,
    routesById: Map<String, RouteData>
) {
    var originId by remember { mutableStateOf<String?>(null) }
    var destId by remember { mutableStateOf<String?>(null) }
    var pickingFor by remember { mutableStateOf<PickTarget?>(null) }
    var results by remember { mutableStateOf<Loadable<List<Journey>>?>(null) }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    var selectedTime by remember { mutableStateOf(LocalTime.now().withSecond(0).withNano(0)) }
    var pickingDate by remember { mutableStateOf(false) }
    var pickingTime by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val stopsById = (stops as? Loadable.Ready)?.data?.associateBy { it.id } ?: emptyMap()
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
        StopPickerField("Von", stopsById[originId]?.name) { pickingFor = PickTarget.ORIGIN }
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            IconButton(onClick = {
                val tmp = originId
                originId = destId
                destId = tmp
            }) {
                Icon(Icons.Filled.SwapVert, contentDescription = "Start und Ziel tauschen")
            }
        }
        StopPickerField("Nach", stopsById[destId]?.name) { pickingFor = PickTarget.DEST }

        Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { pickingDate = true }, modifier = Modifier.weight(1f)) {
                Text("Datum: ${selectedDate.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))}")
            }
            OutlinedButton(onClick = { pickingTime = true }, modifier = Modifier.weight(1f)) {
                Text("Ab: ${selectedTime.format(DateTimeFormatter.ofPattern("HH:mm"))}")
            }
        }

        Button(
            onClick = { search() },
            enabled = originId != null && destId != null && !sameStop,
            modifier = Modifier.padding(top = 12.dp)
        ) {
            Text("Verbindung suchen")
        }
        if (sameStop) {
            Text(
                "Start und Ziel dürfen nicht gleich sein.",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 4.dp)
            )
        }

        when (val r = results) {
            null -> {}
            is Loadable.Loading -> CircularProgressIndicator(modifier = Modifier.padding(top = 16.dp))
            is Loadable.Error -> Text("Fehler: ${r.message}", modifier = Modifier.padding(top = 16.dp))
            is Loadable.Ready -> if (r.data.isEmpty()) {
                Text(
                    "Keine Verbindung gefunden (an diesem Tag/zu dieser Zeit kein Verkehr, oder keine " +
                        "Verbindung mit höchstens einmal Umsteigen).",
                    modifier = Modifier.padding(top = 16.dp)
                )
            } else {
                LazyColumn(contentPadding = PaddingValues(vertical = 12.dp)) {
                    items(r.data) { journey -> JourneyCard(journey, routesById) }
                }
            }
        }
    }

    pickingFor?.let { target ->
        StopPickerDialog(
            fallbackStops = (stops as? Loadable.Ready)?.data ?: emptyList(),
            onDismiss = { pickingFor = null },
            onSelect = { stop ->
                if (target == PickTarget.ORIGIN) originId = stop.id else destId = stop.id
                pickingFor = null
            }
        )
    }

    if (pickingDate) {
        // Material3 DatePicker rechnet intern grundsätzlich in UTC-Millis (unabhängig von der
        // Systemzeitzone) - mit der lokalen Zone gebaute Millis verschieben das angezeigte
        // Datum um einen Tag (in MEZ/MESZ rückwärts). Deshalb hier bewusst UTC statt
        // systemDefault(), das Zurücklesen unten tut das bereits richtig.
        val state = rememberDatePickerState(
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

private enum class PickTarget { ORIGIN, DEST }

@Composable
private fun StopPickerField(label: String, value: String?, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text("$label: ${value ?: "Haltestelle wählen …"}")
    }
}

@Composable
private fun StopPickerDialog(fallbackStops: List<StopData>, onDismiss: () -> Unit, onSelect: (StopData) -> Unit) {
    var query by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<StopData>?>(null) }

    // Serverseitige, alias-bewusste Suche (siehe api/src/stopAliases.ts, gleiches Muster wie
    // StopSearchScreen.kt) statt reinem Client-.contains() - findet z.B. "TH" -> "Technische
    // Hochschule". Bei leerer Eingabe die schon geladene volle Liste zeigen, kein Request nötig.
    LaunchedEffect(query) {
        if (query.isBlank()) {
            searchResults = null
            return@LaunchedEffect
        }
        delay(300)
        when (val r = withContext(Dispatchers.IO) { ScheduleApi.stopsSearch(query) }) {
            is ApiOutcome.Success -> searchResults = r.data
            is ApiOutcome.Failure -> {}
        }
    }

    val shown = searchResults ?: fallbackStops

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        title = { Text("Haltestelle wählen") },
        text = {
            Column {
                OutlinedTextField(value = query, onValueChange = { query = it }, modifier = Modifier.fillMaxWidth())
                LazyColumn(modifier = Modifier.fillMaxWidth()) {
                    items(shown) { stop ->
                        ListItem(
                            headlineContent = { Text(stop.name) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelect(stop) }
                        )
                    }
                }
            }
        }
    )
}
