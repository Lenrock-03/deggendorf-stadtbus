@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package de.kornelriedl.deggendorfstadtbus.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import de.kornelriedl.deggendorfstadtbus.data.api.ApiOutcome
import de.kornelriedl.deggendorfstadtbus.data.api.ScheduleApi
import de.kornelriedl.deggendorfstadtbus.data.model.StopData
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * Durchsuchbares Eingabefeld für eine Haltestelle (Autocomplete) statt einer Modal-Dialog-
 * Liste - Kotlin-Pendant zu StopPicker.tsx (Label über dem Feld, Vorschlagsliste erscheint
 * darunter während der Eingabe). Serverseitige, alias-bewusste Suche wie StopSearchScreen.kt
 * (api/src/stopAliases.ts), leicht verzögert damit nicht bei jedem Tastendruck ein Request
 * rausgeht.
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
    var results by remember { mutableStateOf<List<StopData>>(emptyList()) }

    LaunchedEffect(query) {
        if (query.isBlank()) {
            results = emptyList()
            return@LaunchedEffect
        }
        delay(300)
        when (val r = withContext(Dispatchers.IO) { ScheduleApi.stopsSearch(query) }) {
            is ApiOutcome.Success -> results = r.data
            is ApiOutcome.Failure -> {}
        }
    }

    val menuVisible = expanded && query.isNotBlank()

    Column(modifier = modifier) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        ExposedDropdownMenuBox(expanded = menuVisible, onExpandedChange = { expanded = it }) {
            OutlinedTextField(
                value = query,
                onValueChange = {
                    onQueryChange(it)
                    expanded = true
                },
                singleLine = true,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth().menuAnchor()
            )
            ExposedDropdownMenu(expanded = menuVisible, onDismissRequest = { expanded = false }) {
                if (results.isEmpty()) {
                    DropdownMenuItem(
                        text = {
                            Text(
                                "Keine Haltestelle gefunden",
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        },
                        onClick = {}
                    )
                } else {
                    results.forEach { stop ->
                        DropdownMenuItem(
                            text = { Text(stop.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                            onClick = {
                                onSelect(stop)
                                expanded = false
                            }
                        )
                    }
                }
            }
        }
    }
}
