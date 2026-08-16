package de.kornelriedl.deggendorfstadtbus.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import de.kornelriedl.deggendorfstadtbus.data.model.TimelineStop

/** Fahrtverlauf als Zeitleiste (Startziel-Grafik im Nahverkehr-Stil) - Kotlin-Pendant zu
 * TripTimeline.tsx (Zeit links, Punkt+Verbindungslinie in Linienfarbe in der Mitte, Name
 * rechts; Start-/Endhaltestelle bekommen einen größeren, hohlen Punkt). */
@Composable
fun TripTimelineMini(stops: List<TimelineStop>, lineColor: Color, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth()) {
        stops.forEachIndexed { index, stop ->
            val isEndpoint = stop.isFirst || stop.isLast
            Row(
                modifier = Modifier.fillMaxWidth().height(32.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stop.time?.take(5) ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.End,
                    modifier = Modifier.width(40.dp)
                )
                Box(modifier = Modifier.width(20.dp).fillMaxHeight(), contentAlignment = Alignment.Center) {
                    if (index < stops.lastIndex) {
                        Box(
                            modifier = Modifier
                                .width(2.dp)
                                .fillMaxHeight()
                                .background(lineColor)
                        )
                    }
                    if (isEndpoint) {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .background(MaterialTheme.colorScheme.background, CircleShape)
                                .border(2.5.dp, lineColor, CircleShape)
                        )
                    } else {
                        Box(modifier = Modifier.size(8.dp).background(lineColor, CircleShape))
                    }
                }
                val suffix = buildString {
                    stop.note?.let { append(" ($it)") }
                    if (stop.dropOffOnly) append(" · nur Aussteigen")
                }
                Text(
                    text = stop.name + suffix,
                    fontWeight = if (isEndpoint) FontWeight.Bold else FontWeight.Normal,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}
