package de.kornelriedl.deggendorfstadtbus.ui.util

import androidx.compose.ui.graphics.Color

/** Parst eine "RRGGBB"-Hex-Linienfarbe (ohne #, wie sie das Backend liefert) - Fallback bei
 * kaputten/leeren Werten statt Absturz. */
fun parseHexColor(hex: String, fallback: Color = Color.Gray): Color = try {
    Color(android.graphics.Color.parseColor("#$hex"))
} catch (e: Exception) {
    fallback
}

/** WCAG-Relativluminanz - gleiche Formel wie app/src/lib/color.ts's readableTextColor(),
 * damit Linienbadges/Balkensegmente (blasses Gelb bei Linie 2 etc.) immer lesbaren Text
 * haben. */
fun readableTextColor(hex: String): Color {
    return try {
        val c = Color(android.graphics.Color.parseColor("#$hex"))
        fun channel(v: Float): Double {
            val ch = v.toDouble()
            return if (ch <= 0.03928) ch / 12.92 else Math.pow((ch + 0.055) / 1.055, 2.4)
        }
        val luminance = 0.2126 * channel(c.red) + 0.7152 * channel(c.green) + 0.0722 * channel(c.blue)
        if (luminance > 0.5) Color.Black else Color.White
    } catch (e: Exception) {
        Color.White
    }
}
