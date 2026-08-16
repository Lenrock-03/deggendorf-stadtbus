package de.kornelriedl.deggendorfstadtbus.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.kornelriedl.deggendorfstadtbus.data.model.Journey
import de.kornelriedl.deggendorfstadtbus.data.model.RouteData

private fun timeToMinutes(hhmmss: String): Int {
    val parts = hhmmss.split(":")
    return parts[0].toInt() * 60 + parts[1].toInt()
}

private fun formatDuration(min: Int): String {
    val h = min / 60
    val m = min % 60
    return if (h > 0) "${h}h ${m}min" else "${m}min"
}

@Composable
fun JourneyCard(journey: Journey, routesById: Map<String, RouteData>) {
    val durationMin = timeToMinutes(journey.arrivalTime) - timeToMinutes(journey.departureTime)
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text("${journey.departureTime.take(5)} → ${journey.arrivalTime.take(5)}", style = MaterialTheme.typography.titleMedium)
                val transferLabel = if (journey.legs.size > 1) "1 Umstieg" else "Direkt"
                Text("${formatDuration(durationMin)} · $transferLabel", style = MaterialTheme.typography.bodySmall)
            }
            journey.legs.forEachIndexed { i, leg ->
                Row(
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(top = 8.dp)
                ) {
                    val route = routesById[leg.routeId]
                    if (route != null) LineBadge(route) else Text(leg.routeShortName)
                    Text("${leg.boardStopName} (${leg.boardTime.take(5)}) → ${leg.alightStopName} (${leg.alightTime.take(5)})")
                }
                if (i == 0 && journey.legs.size > 1) {
                    Text(
                        "Umstieg in ${journey.legs[0].alightStopName}" +
                            (journey.transferWaitMin?.let { ", $it min Wartezeit" } ?: ""),
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(start = 8.dp, top = 2.dp)
                    )
                }
            }
        }
    }
}
