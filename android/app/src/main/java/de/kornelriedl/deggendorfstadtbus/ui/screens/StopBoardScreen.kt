@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package de.kornelriedl.deggendorfstadtbus.ui.screens

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
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import de.kornelriedl.deggendorfstadtbus.data.api.ApiOutcome
import de.kornelriedl.deggendorfstadtbus.data.api.ScheduleApi
import de.kornelriedl.deggendorfstadtbus.data.model.DepartureData
import de.kornelriedl.deggendorfstadtbus.data.model.RouteData
import de.kornelriedl.deggendorfstadtbus.data.model.StopData
import de.kornelriedl.deggendorfstadtbus.data.model.TrainDeparture
import de.kornelriedl.deggendorfstadtbus.ui.Loadable
import de.kornelriedl.deggendorfstadtbus.ui.components.FavoriteButton
import de.kornelriedl.deggendorfstadtbus.ui.components.LineBadge
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Einzige Haltestelle, für die die API Zugdaten liefert (siehe api/src/constants.ts). */
private const val DEGGENDORF_HBF_STOP_ID = "deggendorf-hbf"

@Composable
fun StopBoardScreen(
    stop: StopData,
    routesById: Map<String, RouteData>,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
    onBack: () -> Unit
) {
    var departures by remember { mutableStateOf<Loadable<List<DepartureData>>>(Loadable.Loading) }
    // Zugdaten sind additiv/optional - Fehler wird still ignoriert (kein Error-State hier),
    // gleiches Prinzip wie StopBoard.tsx.
    var trainDepartures by remember { mutableStateOf<List<TrainDeparture>?>(null) }

    LaunchedEffect(stop.id) {
        departures = Loadable.Loading
        departures = withContext(Dispatchers.IO) {
            when (val r = ScheduleApi.stopDepartures(stop.id)) {
                is ApiOutcome.Success -> Loadable.Ready(r.data)
                is ApiOutcome.Failure -> Loadable.Error(r.message)
            }
        }
        if (stop.id == DEGGENDORF_HBF_STOP_ID) {
            trainDepartures = withContext(Dispatchers.IO) {
                when (val r = ScheduleApi.trainDepartures()) {
                    is ApiOutcome.Success -> r.data
                    is ApiOutcome.Failure -> null
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stop.name) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Zurück") }
                },
                actions = { FavoriteButton(isFavorite, onToggleFavorite) }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val d = departures) {
                is Loadable.Loading -> CircularProgressIndicator(modifier = Modifier.padding(32.dp))
                is Loadable.Error -> Text("Fehler: ${d.message}", modifier = Modifier.padding(16.dp))
                is Loadable.Ready -> LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    if (d.data.isEmpty()) {
                        item { Text("Heute keine weiteren Fahrten.", style = MaterialTheme.typography.bodyMedium) }
                    }
                    items(d.data) { dep ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(dep.time.take(5))
                            routesById[dep.routeId]?.let { LineBadge(it) }
                            Text(dep.headsign, modifier = Modifier.weight(1f))
                            if (dep.dropOffOnly) Text("nur Aussteigen", style = MaterialTheme.typography.bodySmall)
                        }
                    }

                    trainDepartures?.let { trains ->
                        item {
                            Divider(modifier = Modifier.padding(vertical = 12.dp))
                            Text("Zugabfahrten", style = MaterialTheme.typography.titleMedium, color = Color(0xFFEC0016))
                        }
                        if (trains.isEmpty()) {
                            item { Text("Aktuell keine Zugdaten.", style = MaterialTheme.typography.bodySmall) }
                        }
                        items(trains) { t ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                val hhmm = t.actualTime.substring(11, 16)
                                Text(if (t.delayMin > 0) "$hhmm (+${t.delayMin})" else hhmm)
                                Text(t.line)
                                Text(t.destination, modifier = Modifier.weight(1f))
                                if (t.cancelled) Text("Fällt aus", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        }
    }
}
