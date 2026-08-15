@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package de.kornelriedl.deggendorfstadtbus

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Brightness6
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import de.kornelriedl.deggendorfstadtbus.data.api.ScheduleApi
import de.kornelriedl.deggendorfstadtbus.data.local.FavoritesPreferences
import de.kornelriedl.deggendorfstadtbus.data.local.ThemePreferences
import de.kornelriedl.deggendorfstadtbus.data.model.RouteData
import de.kornelriedl.deggendorfstadtbus.data.model.StopData
import de.kornelriedl.deggendorfstadtbus.ui.Loadable
import de.kornelriedl.deggendorfstadtbus.ui.components.BottomNavBar
import de.kornelriedl.deggendorfstadtbus.ui.components.NavTab
import de.kornelriedl.deggendorfstadtbus.ui.screens.LineDetailScreen
import de.kornelriedl.deggendorfstadtbus.ui.screens.LineOverviewScreen
import de.kornelriedl.deggendorfstadtbus.ui.screens.MapScreen
import de.kornelriedl.deggendorfstadtbus.ui.screens.RoutePlannerScreen
import de.kornelriedl.deggendorfstadtbus.ui.screens.StopBoardScreen
import de.kornelriedl.deggendorfstadtbus.ui.screens.StopSearchScreen
import de.kornelriedl.deggendorfstadtbus.ui.theme.AppTheme
import de.kornelriedl.deggendorfstadtbus.ui.theme.DeggendorfStadtbusTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Pflicht vor der ersten osmdroid-MapView-Nutzung (siehe MapScreen.kt), sonst Crash.
        org.osmdroid.config.Configuration.getInstance()
            .load(applicationContext, getSharedPreferences("osmdroid_prefs", MODE_PRIVATE))
        org.osmdroid.config.Configuration.getInstance().userAgentValue = packageName
        setContent {
            val context = LocalContext.current
            var appTheme by remember { mutableStateOf(ThemePreferences.get(context)) }
            DeggendorfStadtbusTheme(theme = appTheme) {
                App(
                    appTheme = appTheme,
                    onToggleTheme = {
                        val next = ThemePreferences.next(appTheme)
                        ThemePreferences.set(context, next)
                        appTheme = next
                    }
                )
            }
        }
    }
}

@Composable
private fun App(appTheme: AppTheme, onToggleTheme: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var currentTab by remember { mutableStateOf(NavTab.LINIEN) }
    var routesState by remember { mutableStateOf<Loadable<List<RouteData>>>(Loadable.Loading) }
    var stopsState by remember { mutableStateOf<Loadable<List<StopData>>>(Loadable.Loading) }
    var favoriteIds by remember { mutableStateOf(FavoritesPreferences.getFavoriteIds(context)) }
    var selectedRouteId by remember { mutableStateOf<String?>(null) }
    var selectedStopId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        launch(Dispatchers.IO) {
            routesState = when (val r = ScheduleApi.routes()) {
                is de.kornelriedl.deggendorfstadtbus.data.api.ApiOutcome.Success -> Loadable.Ready(r.data)
                is de.kornelriedl.deggendorfstadtbus.data.api.ApiOutcome.Failure -> Loadable.Error(r.message)
            }
        }
        launch(Dispatchers.IO) {
            stopsState = when (val r = ScheduleApi.stops()) {
                is de.kornelriedl.deggendorfstadtbus.data.api.ApiOutcome.Success -> Loadable.Ready(r.data)
                is de.kornelriedl.deggendorfstadtbus.data.api.ApiOutcome.Failure -> Loadable.Error(r.message)
            }
        }
    }

    fun toggleFavorite(stopId: String) {
        favoriteIds = FavoritesPreferences.toggle(context, stopId)
    }

    val routesById = (routesState as? Loadable.Ready)?.data?.associateBy { it.id } ?: emptyMap()
    val stopsById = (stopsState as? Loadable.Ready)?.data?.associateBy { it.id } ?: emptyMap()

    // Detail-Screens (nicht Teil der Bottom-Nav) - nullable-ID-State + BackHandler, gleiches
    // Muster wie DriveTracks selectedTripId/editingCarId (siehe CLAUDE.md).
    selectedRouteId?.let { routeId ->
        BackHandler { selectedRouteId = null }
        val route = routesById[routeId]
        if (route != null) {
            LineDetailScreen(route = route, onBack = { selectedRouteId = null })
            return
        }
    }
    selectedStopId?.let { stopId ->
        BackHandler { selectedStopId = null }
        val stop = stopsById[stopId]
        if (stop != null) {
            StopBoardScreen(
                stop = stop,
                routesById = routesById,
                isFavorite = favoriteIds.contains(stopId),
                onToggleFavorite = { toggleFavorite(stopId) },
                onBack = { selectedStopId = null }
            )
            return
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Deggendorf Busfahrplan") },
                actions = {
                    IconButton(onClick = onToggleTheme) {
                        val icon = when (appTheme) {
                            AppTheme.SYSTEM -> Icons.Filled.Brightness6
                            AppTheme.LIGHT -> Icons.Filled.LightMode
                            AppTheme.DARK -> Icons.Filled.DarkMode
                        }
                        Icon(icon, contentDescription = "Farbschema wechseln")
                    }
                }
            )
        },
        bottomBar = { BottomNavBar(current = currentTab, onSelect = { currentTab = it }) }
    ) { padding ->
        val modifier = androidx.compose.ui.Modifier.padding(padding)
        when (currentTab) {
            NavTab.LINIEN -> LineOverviewScreen(
                modifier = modifier,
                routes = routesState,
                favoriteStops = stopsById.let { byId -> favoriteIds.mapNotNull { byId[it] } },
                onRouteClick = { selectedRouteId = it.id },
                onStopClick = { selectedStopId = it.id }
            )
            NavTab.SUCHE -> StopSearchScreen(
                modifier = modifier,
                stops = stopsState,
                favoriteIds = favoriteIds,
                onStopClick = { selectedStopId = it.id },
                onToggleFavorite = ::toggleFavorite
            )
            NavTab.KARTE -> MapScreen(
                modifier = modifier,
                stops = stopsState,
                favoriteIds = favoriteIds,
                onStopClick = { selectedStopId = it.id }
            )
            NavTab.VERBINDUNG -> RoutePlannerScreen(
                modifier = modifier,
                stops = stopsState,
                routesById = routesById
            )
        }
    }
}
