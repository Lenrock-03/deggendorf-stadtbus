package de.kornelriedl.deggendorfstadtbus.ui

/** Gemeinsamer Lade-/Fehler-/Fertig-Zustand für alle Screens - Pendant zum LoadState-Muster
 * der Web-App (z.B. useSchedule.ts). */
sealed class Loadable<out T> {
    object Loading : Loadable<Nothing>()
    data class Error(val message: String) : Loadable<Nothing>()
    data class Ready<T>(val data: T) : Loadable<T>()
}
