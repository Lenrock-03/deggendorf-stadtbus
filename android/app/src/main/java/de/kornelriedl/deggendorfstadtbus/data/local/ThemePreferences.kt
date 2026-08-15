package de.kornelriedl.deggendorfstadtbus.data.local

import android.content.Context
import de.kornelriedl.deggendorfstadtbus.ui.theme.AppTheme

/** Manuelle Theme-Wahl, lokal gespeichert - Pendant zu app/src/lib/theme.ts. */
object ThemePreferences {
    private const val PREFS_NAME = "theme_prefs"
    private const val KEY_THEME = "theme"

    fun get(context: Context): AppTheme {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return when (prefs.getString(KEY_THEME, null)) {
            "light" -> AppTheme.LIGHT
            "dark" -> AppTheme.DARK
            else -> AppTheme.SYSTEM
        }
    }

    fun set(context: Context, theme: AppTheme) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val value = when (theme) {
            AppTheme.LIGHT -> "light"
            AppTheme.DARK -> "dark"
            AppTheme.SYSTEM -> null
        }
        prefs.edit().putString(KEY_THEME, value).apply()
    }

    /** Zyklus: System -> Hell -> Dunkel -> System (gleiche Reihenfolge wie ThemeToggle.tsx). */
    fun next(current: AppTheme): AppTheme = when (current) {
        AppTheme.SYSTEM -> AppTheme.LIGHT
        AppTheme.LIGHT -> AppTheme.DARK
        AppTheme.DARK -> AppTheme.SYSTEM
    }
}
