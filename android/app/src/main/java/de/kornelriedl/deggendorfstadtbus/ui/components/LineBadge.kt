package de.kornelriedl.deggendorfstadtbus.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import de.kornelriedl.deggendorfstadtbus.data.model.RouteData

/** WCAG-Relativluminanz - gleiche Formel wie app/src/lib/color.ts's readableTextColor(),
 * damit Linienbadges (blasses Gelb bei Linie 2 etc.) immer lesbaren Text haben. */
private fun readableTextColor(hex: String): Color {
    return try {
        val c = Color(android.graphics.Color.parseColor("#$hex"))
        fun channel(v: Float): Double {
            val c = v.toDouble()
            return if (c <= 0.03928) c / 12.92 else Math.pow((c + 0.055) / 1.055, 2.4)
        }
        val luminance = 0.2126 * channel(c.red) + 0.7152 * channel(c.green) + 0.0722 * channel(c.blue)
        if (luminance > 0.5) Color.Black else Color.White
    } catch (e: Exception) {
        Color.White
    }
}

@Composable
fun LineBadge(route: RouteData) {
    val bg = try {
        Color(android.graphics.Color.parseColor("#${route.color}"))
    } catch (e: Exception) {
        MaterialTheme.colorScheme.primary
    }
    Text(
        text = route.shortName,
        color = readableTextColor(route.color),
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .background(bg, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    )
}
