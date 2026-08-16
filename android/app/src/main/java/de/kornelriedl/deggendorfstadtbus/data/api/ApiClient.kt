package de.kornelriedl.deggendorfstadtbus.data.api

import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Schlanker HTTP-Client ohne Retrofit/Ktor - HttpURLConnection + rohes JSON-Text-Parsing,
 * exakt im Stil von DriveTracks data/server/ServerApi.kt. Anders als dort liefern hier
 * einige Endpunkte ein rohes JSON-Array statt eines Objekts zurück, deshalb wird hier der
 * rohe Antworttext durchgereicht statt ihn schon in ein JSONObject zu zwingen - jede
 * aufrufende Stelle im data/model-Paket parst sich ihre erwartete Form (Array oder Objekt)
 * selbst per org.json.
 */
object ApiClient {
    // Läuft hinter demselben Reverse Proxy wie die Web-App (siehe Repo-README, externe
    // VPS-nginx-Config leitet /api/ an den api-Service weiter).
    private const val BASE_URL = "https://deggendorf-stadtbus.kornel-riedl.de/api"

    data class ApiResult(val success: Boolean, val code: Int, val body: String?, val error: String?)

    private fun request(path: String): Pair<Int, String> {
        val url = URL("$BASE_URL$path")
        val connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        connection.connectTimeout = 15_000
        connection.readTimeout = 15_000
        val code = connection.responseCode
        val stream = if (code in 200..299) connection.inputStream else connection.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
        return code to text
    }

    private fun get(path: String): ApiResult {
        return try {
            val (code, text) = request(path)
            if (code in 200..299) {
                ApiResult(true, code, text, null)
            } else {
                val message = try {
                    org.json.JSONObject(text).optString("error", "Fehler $code")
                } catch (e: Exception) {
                    "Fehler $code"
                }
                ApiResult(false, code, null, message)
            }
        } catch (e: Exception) {
            ApiResult(false, -1, null, e.message ?: "Netzwerkfehler")
        }
    }

    private fun enc(s: String): String = URLEncoder.encode(s, "UTF-8")

    fun getRoutes() = get("/routes")
    fun getRouteOutline(routeId: String) = get("/routes/${enc(routeId)}/outline")
    fun getRouteTrips(routeId: String) = get("/routes/${enc(routeId)}/trips")
    fun getRouteTimeline(routeId: String, tripId: String) =
        get("/routes/${enc(routeId)}/timeline?tripId=${enc(tripId)}")

    fun getStops() = get("/stops")
    fun getStopsSearch(query: String) = get("/stops/search?q=${enc(query)}")
    fun getStopsNearest(lat: Double, lon: Double, count: Int = 15) =
        get("/stops/nearest?lat=$lat&lon=$lon&count=$count")

    fun getStopDepartures(stopId: String, count: Int = 8) =
        get("/stops/${enc(stopId)}/departures?mode=next&count=$count")

    fun getJourneys(from: String, to: String, date: String, afterMin: Int, maxResults: Int = 8): ApiResult =
        get("/journeys?from=${enc(from)}&to=${enc(to)}&date=${enc(date)}&afterMin=$afterMin&maxResults=$maxResults")

    fun getMeta() = get("/meta")
    fun getTrainDepartures() = get("/db/departures")
}
