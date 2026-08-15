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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
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
import androidx.compose.ui.unit.dp
import de.kornelriedl.deggendorfstadtbus.data.api.ApiOutcome
import de.kornelriedl.deggendorfstadtbus.data.api.ScheduleApi
import de.kornelriedl.deggendorfstadtbus.data.model.RouteData
import de.kornelriedl.deggendorfstadtbus.data.model.TimelineStop
import de.kornelriedl.deggendorfstadtbus.data.model.TripOption
import de.kornelriedl.deggendorfstadtbus.data.model.label
import de.kornelriedl.deggendorfstadtbus.ui.Loadable
import de.kornelriedl.deggendorfstadtbus.ui.components.LineBadge
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun LineDetailScreen(route: RouteData, onBack: () -> Unit) {
    var outline by remember { mutableStateOf<Loadable<List<TimelineStop>>>(Loadable.Loading) }
    var trips by remember { mutableStateOf<Loadable<List<TripOption>>>(Loadable.Loading) }
    var selectedTripId by remember { mutableStateOf<String?>(null) }
    var timeline by remember { mutableStateOf<Loadable<List<TimelineStop>>?>(null) }

    LaunchedEffect(route.id) {
        withContext(Dispatchers.IO) {
            outline = when (val r = ScheduleApi.routeOutline(route.id)) {
                is ApiOutcome.Success -> Loadable.Ready(r.data)
                is ApiOutcome.Failure -> Loadable.Error(r.message)
            }
            trips = when (val r = ScheduleApi.routeTrips(route.id)) {
                is ApiOutcome.Success -> Loadable.Ready(r.data)
                is ApiOutcome.Failure -> Loadable.Error(r.message)
            }
        }
    }

    LaunchedEffect(selectedTripId) {
        val tripId = selectedTripId ?: run { timeline = null; return@LaunchedEffect }
        timeline = Loadable.Loading
        timeline = withContext(Dispatchers.IO) {
            when (val r = ScheduleApi.routeTimeline(route.id, tripId)) {
                is ApiOutcome.Success -> Loadable.Ready(r.data)
                is ApiOutcome.Failure -> Loadable.Error(r.message)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        LineBadge(route)
                        Text(route.longName)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Zurück") }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            (trips as? Loadable.Ready)?.let { r ->
                if (r.data.isNotEmpty()) {
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)) {
                        items(r.data) { trip ->
                            FilterChip(
                                selected = trip.tripId == selectedTripId,
                                onClick = { selectedTripId = if (selectedTripId == trip.tripId) null else trip.tripId },
                                label = { Text(trip.label()) },
                                modifier = Modifier.padding(end = 6.dp)
                            )
                        }
                    }
                }
            }

            val shown = timeline ?: outline
            when (shown) {
                is Loadable.Loading -> CircularProgressIndicator(modifier = Modifier.padding(32.dp))
                is Loadable.Error -> Text("Fehler: ${shown.message}", modifier = Modifier.padding(16.dp))
                is Loadable.Ready -> LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    items(shown.data) { stop ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(stop.name)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                stop.time?.let { Text(it.take(5)) }
                                if (stop.dropOffOnly) {
                                    Text("nur Aussteigen", style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
