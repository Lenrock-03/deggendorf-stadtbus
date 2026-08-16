package de.kornelriedl.deggendorfstadtbus.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import de.kornelriedl.deggendorfstadtbus.data.api.ApiOutcome
import de.kornelriedl.deggendorfstadtbus.data.api.ScheduleApi
import de.kornelriedl.deggendorfstadtbus.data.model.Journey
import de.kornelriedl.deggendorfstadtbus.data.model.JourneyLeg
import de.kornelriedl.deggendorfstadtbus.data.model.RouteData
import de.kornelriedl.deggendorfstadtbus.data.model.TimelineStop
import de.kornelriedl.deggendorfstadtbus.ui.Loadable
import de.kornelriedl.deggendorfstadtbus.ui.util.parseHexColor
import de.kornelriedl.deggendorfstadtbus.ui.util.readableTextColor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private fun timeToMinutes(hhmmss: String): Int {
    val parts = hhmmss.split(":")
    return parts[0].toInt() * 60 + parts[1].toInt()
}

private fun formatDuration(min: Int): String {
    val h = min / 60
    val m = min % 60
    return if (h > 0) "${h}h ${m}min" else "${m}min"
}

private sealed class BarSegment {
    data class Leg(val shortName: String, val color: String, val minutes: Int) : BarSegment()
    data class Wait(val minutes: Int) : BarSegment()
}

/** Proportionale Balkensegmente je Fahrtabschnitt/Umstiegs-Wartezeit - Kotlin-Pendant zu
 * JourneyCard.tsx's buildSegments(). Die Minutenwerte dienen direkt als RowScope.weight()
 * (relative Gewichtung reicht, keine Umrechnung in Prozent nötig). */
private fun buildSegments(journey: Journey): List<BarSegment> {
    val segments = mutableListOf<BarSegment>()
    journey.legs.forEachIndexed { i, leg ->
        val legMin = maxOf(1, timeToMinutes(leg.alightTime) - timeToMinutes(leg.boardTime))
        segments += BarSegment.Leg(leg.routeShortName, leg.routeColor, legMin)
        val next = journey.legs.getOrNull(i + 1)
        if (next != null) {
            val waitMin = maxOf(0, timeToMinutes(next.boardTime) - timeToMinutes(leg.alightTime))
            if (waitMin > 0) segments += BarSegment.Wait(waitMin)
        }
    }
    return segments
}

/** Schneidet aus dem vollen Fahrtverlauf einer Linie/Fahrt (siehe api/src/tripTimeline.ts's
 * timelineForTrip) nur den Abschnitt zwischen Ein- und Ausstieg heraus - Kotlin-Pendant zu
 * timelineSegment(). Zeit UND Haltestelle müssen übereinstimmen, da Ringlinien dieselbe
 * Haltestelle mehrfach anfahren können. */
private fun sliceTimelineSegment(
    full: List<TimelineStop>,
    fromStopId: String,
    fromTime: String,
    toStopId: String,
    toTime: String
): List<TimelineStop> {
    val startIdx = full.indexOfFirst { it.stopId == fromStopId && it.time == fromTime }
    if (startIdx == -1) return emptyList()
    var endIdx = -1
    for (i in startIdx until full.size) {
        if (full[i].stopId == toStopId && full[i].time == toTime) {
            endIdx = i
            break
        }
    }
    if (endIdx == -1) return emptyList()
    return full.subList(startIdx, endIdx + 1).mapIndexed { i, s ->
        s.copy(isFirst = i == 0, isLast = i == endIdx - startIdx)
    }
}

@Composable
fun JourneyCard(journey: Journey, routesById: Map<String, RouteData>) {
    var open by remember { mutableStateOf(false) }
    val durationMin = timeToMinutes(journey.arrivalTime) - timeToMinutes(journey.departureTime)
    val segments = remember(journey) { buildSegments(journey) }
    val first = journey.legs.first()
    val last = journey.legs.last()

    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    "${journey.departureTime.take(5)} – ${journey.arrivalTime.take(5)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                val transferLabel = if (journey.legs.size > 1) "${journey.legs.size - 1}× umsteigen" else "direkt"
                Text(
                    "${formatDuration(durationMin)} · $transferLabel",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(28.dp)
                    .clip(RoundedCornerShape(6.dp)),
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                segments.forEach { seg ->
                    when (seg) {
                        is BarSegment.Leg -> LegSegment(seg)
                        is BarSegment.Wait -> WaitSegment(seg)
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(
                    first.boardStopName,
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    last.alightStopName,
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = androidx.compose.ui.text.style.TextAlign.End,
                    modifier = Modifier.weight(1f)
                )
            }

            Text(
                if (open) "Details ▲" else "Details ▼",
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.clickable { open = !open }
            )

            if (open) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    journey.legs.forEachIndexed { i, leg ->
                        LegDetails(leg, routesById[leg.routeId])
                        val next = journey.legs.getOrNull(i + 1)
                        if (next != null) {
                            Text(
                                "Umstieg in ${leg.alightStopName}: Ankunft ${leg.alightTime.take(5)} → " +
                                    "Abfahrt ${next.boardTime.take(5)}" +
                                    (journey.transferWaitMin?.let { " ($it Min.)" } ?: ""),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RowScope.LegSegment(seg: BarSegment.Leg) {
    val bg = parseHexColor(seg.color)
    Box(
        modifier = Modifier
            .weight(seg.minutes.toFloat())
            .fillMaxHeight()
            .background(bg),
        contentAlignment = Alignment.Center
    ) {
        Text(
            seg.shortName,
            color = readableTextColor(seg.color),
            fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.labelSmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 4.dp)
        )
    }
}

@Composable
private fun RowScope.WaitSegment(seg: BarSegment.Wait) {
    val stripeColor = MaterialTheme.colorScheme.outline
    Canvas(modifier = Modifier.weight(seg.minutes.toFloat()).fillMaxHeight()) {
        val stripeWidthPx = 4.dp.toPx()
        val period = stripeWidthPx * 2
        var offset = -size.height
        while (offset < size.width) {
            drawLine(
                color = stripeColor,
                start = Offset(offset, size.height),
                end = Offset(offset + size.height, 0f),
                strokeWidth = stripeWidthPx
            )
            offset += period
        }
    }
}

@Composable
private fun LegDetails(leg: JourneyLeg, route: RouteData?) {
    var timeline by remember(leg) { mutableStateOf<Loadable<List<TimelineStop>>>(Loadable.Loading) }

    LaunchedEffect(leg.tripId, leg.boardStopId, leg.boardTime, leg.alightStopId, leg.alightTime) {
        timeline = Loadable.Loading
        timeline = withContext(Dispatchers.IO) {
            when (val r = ScheduleApi.routeTimeline(leg.routeId, leg.tripId)) {
                is ApiOutcome.Success ->
                    Loadable.Ready(sliceTimelineSegment(r.data, leg.boardStopId, leg.boardTime, leg.alightStopId, leg.alightTime))
                is ApiOutcome.Failure -> Loadable.Error(r.message)
            }
        }
    }

    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(bottom = 4.dp)
        ) {
            if (route != null) LineBadge(route) else Text(leg.routeShortName, fontWeight = FontWeight.Bold)
            Text("nach ${leg.headsign}", fontWeight = FontWeight.SemiBold)
        }
        when (val t = timeline) {
            is Loadable.Loading -> CircularProgressIndicator(modifier = Modifier.padding(8.dp))
            // Zeitleisten-Detail ist rein additiv - Fehler wird still ignoriert, gleiches
            // Prinzip wie die Zugabfahrten in StopBoardScreen.kt.
            is Loadable.Error -> {}
            is Loadable.Ready -> TripTimelineMini(t.data, parseHexColor(leg.routeColor))
        }
    }
}
