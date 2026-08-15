package de.kornelriedl.deggendorfstadtbus.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.kornelriedl.deggendorfstadtbus.data.model.RouteData
import de.kornelriedl.deggendorfstadtbus.data.model.StopData
import de.kornelriedl.deggendorfstadtbus.ui.Loadable
import de.kornelriedl.deggendorfstadtbus.ui.components.LineBadge

@Composable
fun LineOverviewScreen(
    modifier: Modifier = Modifier,
    routes: Loadable<List<RouteData>>,
    favoriteStops: List<StopData>,
    onRouteClick: (RouteData) -> Unit,
    onStopClick: (StopData) -> Unit
) {
    when (routes) {
        is Loadable.Loading -> CircularProgressIndicator(modifier = modifier.padding(32.dp))
        is Loadable.Error -> Text("Fehler: ${routes.message}", modifier = modifier.padding(16.dp))
        is Loadable.Ready -> LazyColumn(modifier = modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
            if (favoriteStops.isNotEmpty()) {
                item { Text("Favoriten", style = MaterialTheme.typography.titleMedium) }
                items(favoriteStops) { stop ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        onClick = { onStopClick(stop) }
                    ) {
                        Text(stop.name, modifier = Modifier.padding(16.dp))
                    }
                }
                item { Spacer(Modifier.height(8.dp)) }
            }
            item { Text("Linien", style = MaterialTheme.typography.titleMedium) }
            items(routes.data) { route ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    onClick = { onRouteClick(route) }
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        LineBadge(route)
                        Text(route.longName)
                    }
                }
            }
        }
    }
}
