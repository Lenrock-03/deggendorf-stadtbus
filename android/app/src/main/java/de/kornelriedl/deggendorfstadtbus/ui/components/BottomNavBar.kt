package de.kornelriedl.deggendorfstadtbus.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsBus
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector

/** Kein Navigation-Compose-Graph (siehe Plan/CLAUDE.md) - einfacher enum-basierter
 * Tab-Switch, gleiches Muster wie DriveTracks NavTab. */
enum class NavTab(val label: String, val icon: ImageVector) {
    LINIEN("Linien", Icons.Filled.DirectionsBus),
    SUCHE("Suche", Icons.Filled.Search),
    KARTE("Karte", Icons.Filled.Map),
    VERBINDUNG("Verbindung", Icons.Filled.SwapHoriz)
}

@Composable
fun BottomNavBar(current: NavTab, onSelect: (NavTab) -> Unit) {
    NavigationBar {
        NavTab.entries.forEach { tab ->
            NavigationBarItem(
                selected = tab == current,
                onClick = { onSelect(tab) },
                icon = { Icon(tab.icon, contentDescription = tab.label) },
                label = { Text(tab.label) }
            )
        }
    }
}
