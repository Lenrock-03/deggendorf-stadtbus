package de.kornelriedl.deggendorfstadtbus.data.model

import org.json.JSONObject

data class JourneyLeg(
    val routeId: String,
    val routeShortName: String,
    val routeColor: String,
    val tripId: String,
    val boardStopId: String,
    val boardStopName: String,
    val boardTime: String,
    val alightStopId: String,
    val alightStopName: String,
    val alightTime: String,
    val headsign: String
) {
    companion object {
        fun fromJson(o: JSONObject) = JourneyLeg(
            o.getString("routeId"),
            o.getString("routeShortName"),
            o.getString("routeColor"),
            o.getString("tripId"),
            o.getString("boardStopId"),
            o.getString("boardStopName"),
            o.getString("boardTime"),
            o.getString("alightStopId"),
            o.getString("alightStopName"),
            o.getString("alightTime"),
            o.optString("headsign", "")
        )
    }
}

data class Journey(
    val legs: List<JourneyLeg>,
    val departureTime: String,
    val arrivalTime: String,
    /** Wartezeit am Umstiegshalt in Minuten, nur bei 2 Etappen gesetzt. */
    val transferWaitMin: Int?
) {
    companion object {
        fun fromJson(o: JSONObject): Journey {
            val legsArr = o.getJSONArray("legs")
            val legs = (0 until legsArr.length()).map { JourneyLeg.fromJson(legsArr.getJSONObject(it)) }
            return Journey(
                legs,
                o.getString("departureTime"),
                o.getString("arrivalTime"),
                if (o.has("transferWaitMin") && !o.isNull("transferWaitMin")) o.getInt("transferWaitMin") else null
            )
        }
    }
}
