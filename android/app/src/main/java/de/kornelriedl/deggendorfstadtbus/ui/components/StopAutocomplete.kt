package de.kornelriedl.deggendorfstadtbus.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import de.kornelriedl.deggendorfstadtbus.data.api.ApiOutcome
import de.kornelriedl.deggendorfstadtbus.data.api.ScheduleApi
import de.kornelriedl.deggendorfstadtbus.data.model.StopData
import de.kornelriedl.deggendorfstadtbus.data.model.StopsNearAddressResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

private fun formatDistance(m: Double): String =
    if (m < 1000) "${(Math.round(m / 10) * 10).toInt()} m" else "%.1f km".format(m / 1000)

/**
 * Durchsuchbares Eingabefeld für eine Haltestelle (Autocomplete) statt einer Modal-Dialog-
 * Liste - Kotlin-Pendant zu StopPicker.tsx (Label über dem Feld, Vorschlagsliste erscheint
 * darunter während der Eingabe). Serverseitige, alias-bewusste Suche wie StopSearchScreen.kt
 * (api/src/stopAliases.ts), leicht verzögert damit nicht bei jedem Tastendruck ein Request
 * rausgeht.
 *
 * Bewusst KEIN ExposedDropdownMenuBox/ExposedDropdownMenu (Material3) - dessen Popup-/
 * Anchor-Verwaltung hat mit dem OutlinedTextField-InputConnection kollidiert (Symptom: zwei
 * Rücktasten-Drücke nötig, um ein Zeichen zu löschen; Haltestelle musste exakt 1:1 eingegeben
 * werden, weil Zwischenzustände beim Tippen verloren gingen). Stattdessen eine simple, inline
 * unter dem Feld eingeblendete Vorschlagsliste ohne eigenes Popup/Fokus-Handling.
 *
 * Fällt zusätzlich auf eine Adresssuche zurück, wenn die Eingabe keiner Haltestelle im Namen
 * entspricht (z.B. "Further Straße 12" statt eines Haltestellennamens) - siehe
 * api/src/geocode.ts + getStopsNearAddress: zeigt dann alle Haltestellen im 500m-Umkreis der
 * gefundenen Adresse statt nur einer einzelnen "nächsten" Haltestelle.
 */
@Composable
fun StopAutocomplete(
    label: String,
    query: String,
    onQueryChange: (String) -> Unit,
    onSelect: (StopData) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var results by remember { mutableStateOf<List<StopData>>(emptyList()) }
    var addressResult by remember { mutableStateOf<StopsNearAddressResult?>(null) }

    LaunchedEffect(query) {
        addressResult = null
        if (query.isBlank()) {
            results = emptyList()
            loading = false
            return@LaunchedEffect
        }
        delay(300)
        loading = true
        results = when (val r = withContext(Dispatchers.IO) { ScheduleApi.stopsSearch(query) }) {
            is ApiOutcome.Success -> r.data
            is ApiOutcome.Failure -> emptyList()
        }
        // Kein Treffer nach Haltestellenname -> als Adresse versuchen, zeigt alle
        // Haltestellen in der Nähe statt einer leeren Liste.
        if (results.isEmpty()) {
            when (val r = withContext(Dispatchers.IO) { ScheduleApi.stopsNearAddress(query) }) {
                is ApiOutcome.Success -> addressResult = r.data
                is ApiOutcome.Failure -> {}
            }
        }
        loading = false
    }

    val showSuggestions = expanded && query.isNotBlank()

    Column(modifier = modifier) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        OutlinedTextField(
            value = query,
            onValueChange = {
                onQueryChange(it)
                expanded = true
            },
            singleLine = true,
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier
                .fillMaxWidth()
                .onFocusChanged { if (!it.isFocused) expanded = false }
        )

        if (showSuggestions) {
            Card(
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
            ) {
                Column(modifier = Modifier.padding(vertical = 4.dp)) {
                    when {
                        loading -> CircularProgressIndicator(
                            modifier = Modifier.padding(16.dp).size(20.dp),
                            strokeWidth = 2.dp
                        )
                        results.isNotEmpty() -> results.forEach { stop ->
                            DropdownMenuItem(
                                text = { Text(stop.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                onClick = {
                                    onSelect(stop)
                                    expanded = false
                                }
                            )
                        }
                        addressResult != null && addressResult!!.stops.isNotEmpty() -> {
                            Text(
                                "In der Nähe von: ${addressResult!!.resolved}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                            )
                            addressResult!!.stops.forEach { r ->
                                DropdownMenuItem(
                                    text = {
                                        Column {
                                            Text(r.stop.name, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                            Text(
                                                formatDistance(r.distanceM),
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    },
                                    onClick = {
                                        onSelect(r.stop)
                                        expanded = false
                                    }
                                )
                            }
                        }
                        else -> DropdownMenuItem(
                            text = {
                                Text(
                                    "Keine Haltestelle gefunden",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            },
                            onClick = {}
                        )
                    }
                }
            }
        }
    }
}
