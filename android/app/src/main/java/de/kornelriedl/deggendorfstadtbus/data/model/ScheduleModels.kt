package de.kornelriedl.deggendorfstadtbus.data.model

import org.json.JSONArray
import org.json.JSONObject

// 1:1-Pendants zu api/src/types.ts (bzw. app/src/types/data.ts) - manuelles org.json-Parsing
// statt kotlinx.serialization, im Stil von DriveTracks data/server/ServerApi.kt.

data class RouteData(val id: String, val shortName: String, val longName: String, val color: String) {
    companion object {
        fun fromJson(o: JSONObject) =
            RouteData(o.getString("id"), o.getString("shortName"), o.getString("longName"), o.getString("color"))
    }
}

data class StopData(val id: String, val name: String, val lat: Double?, val lon: Double?) {
    companion object {
        fun fromJson(o: JSONObject) = StopData(
            o.getString("id"),
            o.getString("name"),
            if (o.has("lat") && !o.isNull("lat")) o.getDouble("lat") else null,
            if (o.has("lon") && !o.isNull("lon")) o.getDouble("lon") else null
        )
    }
}

data class StopWithDistance(val stop: StopData, val distanceM: Double) {
    companion object {
        fun fromJson(o: JSONObject) = StopWithDistance(StopData.fromJson(o), o.getDouble("distanceM"))
    }
}

data class DepartureData(
    val tripId: String,
    val routeId: String,
    val service: String,
    /** HH:MM:SS, kann >24:00:00 sein bei Tagesüberlauf (siehe api/src/time.ts) */
    val time: String,
    val stopSeq: Int,
    val headsign: String,
    val dropOffOnly: Boolean
) {
    companion object {
        fun fromJson(o: JSONObject) = DepartureData(
            o.getString("tripId"),
            o.getString("routeId"),
            o.getString("service"),
            o.getString("time"),
            o.getInt("stopSeq"),
            o.optString("headsign", ""),
            o.optBoolean("dropOffOnly", false)
        )
    }
}

data class MetaData(
    val generatedAt: String,
    val source: String,
    val disclaimer: String,
    val attribution: String,
    val lineCount: Int
) {
    companion object {
        fun fromJson(o: JSONObject) = MetaData(
            o.optString("generatedAt", ""),
            o.optString("source", ""),
            o.optString("disclaimer", ""),
            o.optString("attribution", ""),
            o.optInt("lineCount", 0)
        )
    }
}

fun <T> JSONArray.mapObjects(transform: (JSONObject) -> T): List<T> =
    (0 until length()).map { transform(getJSONObject(it)) }
