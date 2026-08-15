package de.kornelriedl.deggendorfstadtbus.data.local

import android.content.Context

/** Favoriten-Haltestellen-IDs, lokal gespeichert - Pendant zu app/src/lib/favorites.ts. */
object FavoritesPreferences {
    private const val PREFS_NAME = "favorites_prefs"
    private const val KEY_STOP_IDS = "favorite_stop_ids"

    fun getFavoriteIds(context: Context): Set<String> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getStringSet(KEY_STOP_IDS, emptySet()) ?: emptySet()
    }

    fun toggle(context: Context, stopId: String): Set<String> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val current = (prefs.getStringSet(KEY_STOP_IDS, emptySet()) ?: emptySet()).toMutableSet()
        if (!current.add(stopId)) current.remove(stopId)
        prefs.edit().putStringSet(KEY_STOP_IDS, current).apply()
        return current
    }
}
