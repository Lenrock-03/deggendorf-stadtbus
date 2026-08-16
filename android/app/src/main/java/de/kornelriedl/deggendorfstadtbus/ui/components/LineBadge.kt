package de.kornelriedl.deggendorfstadtbus.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import de.kornelriedl.deggendorfstadtbus.data.model.RouteData
import de.kornelriedl.deggendorfstadtbus.ui.util.parseHexColor
import de.kornelriedl.deggendorfstadtbus.ui.util.readableTextColor

@Composable
fun LineBadge(route: RouteData) {
    val bg = parseHexColor(route.color, fallback = MaterialTheme.colorScheme.primary)
    Text(
        text = route.shortName,
        color = readableTextColor(route.color),
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .background(bg, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    )
}
