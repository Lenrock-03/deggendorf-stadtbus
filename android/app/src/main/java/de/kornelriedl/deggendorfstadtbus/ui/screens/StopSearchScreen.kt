package de.kornelriedl.deggendorfstadtbus.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import de.kornelriedl.deggendorfstadtbus.data.api.ApiOutcome
import de.kornelriedl.deggendorfstadtbus.data.api.ScheduleApi
import de.kornelriedl.deggendorfstadtbus.data.model.StopData
import de.kornelriedl.deggendorfstadtbus.data.model.StopWithDistance
import de.kornelriedl.deggendorfstadtbus.ui.Loadable
import de.kornelriedl.deggendorfstadtbus.ui.components.FavoriteButton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private sealed class LocationStatus {
    object Idle : LocationStatus()
    object Loading : LocationStatus()
    data class Error(val message: String) : LocationStatus()
}

private fun formatDistance(m: Double): String =
    if (m < 1000) "${(Math.round(m / 10) * 10).toInt()} m" else "%.1f km".format(m / 1000)

@Composable
fun StopSearchScreen(
    modifier: Modifier = Modifier,
    stops: Loadable<List<StopData>>,
    favoriteIds: Set<String>,
    onStopClick: (StopData) -> Unit,
    onToggleFavorite: (String) -> Unit
) {
    var query by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<StopData>?>(null) }
    var nearestResults by remember { mutableStateOf<List<StopWithDistance>?>(null) }
    var locationStatus by remember { mutableStateOf<LocationStatus>(LocationStatus.Idle) }

    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val fusedClient = remember { LocationServices.getFusedLocationProviderClient(context) }

    fun fetchNearest(lat: Double, lon: Double) {
        scope.launch(Dispatchers.IO) {
            when (val r = ScheduleApi.stopsNearest(lat, lon)) {
                is ApiOutcome.Success -> {
                    nearestResults = r.data
                    locationStatus = LocationStatus.Idle
                }
                is ApiOutcome.Failure -> locationStatus = LocationStatus.Error(r.message)
            }
        }
    }

    fun requestLocation() {
        locationStatus = LocationStatus.Loading
        fusedClient.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, CancellationTokenSource().token)
            .addOnSuccessListener { loc ->
                if (loc != null) fetchNearest(loc.latitude, loc.longitude)
                else locationStatus = LocationStatus.Error("Standort konnte nicht ermittelt werden.")
            }
            .addOnFailureListener {
                locationStatus = LocationStatus.Error("Standort konnte nicht ermittelt werden.")
            }
    }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        if (granted.values.any { it }) requestLocation()
        else locationStatus = LocationStatus.Error("Standortzugriff wurde verweigert.")
    }

    fun useMyLocation() {
        val hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        if (hasPermission) requestLocation()
        else permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
    }

    // Serverseitige Suche (siehe api/src/routes.ts getStopsSearch, inkl. Alias-Tabelle) statt
    // Client-Filter - leicht verzögert, damit nicht bei jedem Tastendruck ein Request rausgeht.
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

    Column(modifier = modifier.fillMaxWidth().padding(16.dp)) {
        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it
                nearestResults = null
            },
            label = { Text("Haltestelle suchen") },
            placeholder = { Text("z.B. Klinikum, Busbahnhof, Luitpoldplatz …") },
            modifier = Modifier.fillMaxWidth()
        )
        Button(onClick = { useMyLocation() }, modifier = Modifier.padding(top = 8.dp)) {
            Icon(Icons.Filled.LocationOn, contentDescription = null)
            Text(
                if (locationStatus == LocationStatus.Loading) "Standort wird ermittelt …" else "Standort verwenden",
                modifier = Modifier.padding(start = 6.dp)
            )
        }
        (locationStatus as? LocationStatus.Error)?.let {
            Text(it.message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 4.dp))
        }

        when {
            nearestResults != null -> LazyColumn(contentPadding = PaddingValues(vertical = 12.dp)) {
                items(nearestResults!!) { r ->
                    StopRow(r.stop, favoriteIds.contains(r.stop.id), formatDistance(r.distanceM), onStopClick, onToggleFavorite)
                }
            }
            searchResults != null -> LazyColumn(contentPadding = PaddingValues(vertical = 12.dp)) {
                items(searchResults!!) { s -> StopRow(s, favoriteIds.contains(s.id), null, onStopClick, onToggleFavorite) }
            }
            stops is Loadable.Ready -> LazyColumn(contentPadding = PaddingValues(vertical = 12.dp)) {
                items(stops.data) { s -> StopRow(s, favoriteIds.contains(s.id), null, onStopClick, onToggleFavorite) }
            }
            stops is Loadable.Error -> Text("Fehler: ${stops.message}", modifier = Modifier.padding(top = 16.dp))
            else -> CircularProgressIndicator(modifier = Modifier.padding(top = 16.dp))
        }
    }
}

@Composable
private fun StopRow(
    stop: StopData,
    isFavorite: Boolean,
    distance: String?,
    onClick: (StopData) -> Unit,
    onToggleFavorite: (String) -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), onClick = { onClick(stop) }) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(stop.name)
                distance?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
            }
            FavoriteButton(isFavorite) { onToggleFavorite(stop.id) }
        }
    }
}
