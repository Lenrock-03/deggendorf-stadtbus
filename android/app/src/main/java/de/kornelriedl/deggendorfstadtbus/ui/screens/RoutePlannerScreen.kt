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
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import kotlinx.coroutines.launch

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
    val scope = rememberCoroutineScope()

    val stopsById = (stops as? Loadable.Ready)?.data?.associateBy { it.id } ?: emptyMap()

    fun search() {
        val from = originId ?: return
        val to = destId ?: return
        results = Loadable.Loading
        scope.launch(Dispatchers.IO) {
            results = when (val r = ScheduleApi.journeys(from, to)) {
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

        Button(
            onClick = { search() },
            enabled = originId != null && destId != null && originId != destId,
            modifier = Modifier.padding(top = 12.dp)
        ) {
            Text("Verbindung suchen")
        }

        when (val r = results) {
            null -> {}
            is Loadable.Loading -> CircularProgressIndicator(modifier = Modifier.padding(top = 16.dp))
            is Loadable.Error -> Text("Fehler: ${r.message}", modifier = Modifier.padding(top = 16.dp))
            is Loadable.Ready -> if (r.data.isEmpty()) {
                Text("Keine Verbindung gefunden.", modifier = Modifier.padding(top = 16.dp))
            } else {
                LazyColumn(contentPadding = PaddingValues(vertical = 12.dp)) {
                    items(r.data) { journey -> JourneyCard(journey, routesById) }
                }
            }
        }
    }

    pickingFor?.let { target ->
        StopPickerDialog(
            stops = (stops as? Loadable.Ready)?.data ?: emptyList(),
            onDismiss = { pickingFor = null },
            onSelect = { stop ->
                if (target == PickTarget.ORIGIN) originId = stop.id else destId = stop.id
                pickingFor = null
            }
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
private fun StopPickerDialog(stops: List<StopData>, onDismiss: () -> Unit, onSelect: (StopData) -> Unit) {
    var query by remember { mutableStateOf("") }
    val filtered = remember(query, stops) {
        if (query.isBlank()) stops else stops.filter { it.name.contains(query, ignoreCase = true) }
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        title = { Text("Haltestelle wählen") },
        text = {
            Column {
                OutlinedTextField(value = query, onValueChange = { query = it }, modifier = Modifier.fillMaxWidth())
                LazyColumn(modifier = Modifier.fillMaxWidth()) {
                    items(filtered) { stop ->
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
