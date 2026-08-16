package de.kornelriedl.deggendorfstadtbus.data.api

import de.kornelriedl.deggendorfstadtbus.data.model.DepartureData
import de.kornelriedl.deggendorfstadtbus.data.model.Journey
import de.kornelriedl.deggendorfstadtbus.data.model.MetaData
import de.kornelriedl.deggendorfstadtbus.data.model.RouteData
import de.kornelriedl.deggendorfstadtbus.data.model.StopData
import de.kornelriedl.deggendorfstadtbus.data.model.StopWithDistance
import de.kornelriedl.deggendorfstadtbus.data.model.TimelineStop
import de.kornelriedl.deggendorfstadtbus.data.model.TrainDeparture
import de.kornelriedl.deggendorfstadtbus.data.model.TripOption
import de.kornelriedl.deggendorfstadtbus.data.model.mapObjects
import org.json.JSONArray

/** Ergebnistyp für alle Aufrufe unten - Pendant zu DriveTracks ApiResult, aber generisch über
 * den schon geparsten Datentyp statt rohem JSON, da die API hier teils Arrays statt Objekte
 * liefert. Aufrufe müssen aus Dispatchers.IO erfolgen (blockierendes HttpURLConnection). */
sealed class ApiOutcome<out T> {
    data class Success<T>(val data: T) : ApiOutcome<T>()
    data class Failure(val message: String) : ApiOutcome<Nothing>()
}

private inline fun <T> parse(result: ApiClient.ApiResult, crossinline transform: (String) -> T): ApiOutcome<T> {
    if (!result.success || result.body == null) return ApiOutcome.Failure(result.error ?: "Unbekannter Fehler")
    return try {
        ApiOutcome.Success(transform(result.body))
    } catch (e: Exception) {
        ApiOutcome.Failure("Antwort konnte nicht gelesen werden: ${e.message}")
    }
}

object ScheduleApi {
    fun routes(): ApiOutcome<List<RouteData>> =
        parse(ApiClient.getRoutes()) { JSONArray(it).mapObjects(RouteData::fromJson) }

    fun routeOutline(routeId: String): ApiOutcome<List<TimelineStop>> =
        parse(ApiClient.getRouteOutline(routeId)) { JSONArray(it).mapObjects(TimelineStop::fromJson) }

    fun routeTrips(routeId: String): ApiOutcome<List<TripOption>> =
        parse(ApiClient.getRouteTrips(routeId)) { JSONArray(it).mapObjects(TripOption::fromJson) }

    fun routeTimeline(routeId: String, tripId: String): ApiOutcome<List<TimelineStop>> =
        parse(ApiClient.getRouteTimeline(routeId, tripId)) { JSONArray(it).mapObjects(TimelineStop::fromJson) }

    fun stops(): ApiOutcome<List<StopData>> =
        parse(ApiClient.getStops()) { JSONArray(it).mapObjects(StopData::fromJson) }

    fun stopsSearch(query: String): ApiOutcome<List<StopData>> =
        parse(ApiClient.getStopsSearch(query)) { JSONArray(it).mapObjects(StopData::fromJson) }

    fun stopsNearest(lat: Double, lon: Double, count: Int = 15): ApiOutcome<List<StopWithDistance>> =
        parse(ApiClient.getStopsNearest(lat, lon, count)) { JSONArray(it).mapObjects(StopWithDistance::fromJson) }

    fun stopDepartures(stopId: String, count: Int = 8): ApiOutcome<List<DepartureData>> =
        parse(ApiClient.getStopDepartures(stopId, count)) { JSONArray(it).mapObjects(DepartureData::fromJson) }

    fun journeys(from: String, to: String, date: String, afterMin: Int, maxResults: Int = 8): ApiOutcome<List<Journey>> =
        parse(ApiClient.getJourneys(from, to, date, afterMin, maxResults)) { JSONArray(it).mapObjects(Journey::fromJson) }

    fun meta(): ApiOutcome<MetaData> =
        parse(ApiClient.getMeta()) { MetaData.fromJson(org.json.JSONObject(it)) }

    fun trainDepartures(): ApiOutcome<List<TrainDeparture>> =
        parse(ApiClient.getTrainDepartures()) { JSONArray(it).mapObjects(TrainDeparture::fromJson) }
}
