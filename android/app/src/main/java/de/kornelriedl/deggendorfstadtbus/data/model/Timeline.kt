package de.kornelriedl.deggendorfstadtbus.data.model

import org.json.JSONObject

data class TripOption(val tripId: String, val service: String, val startTime: String) {
    companion object {
        fun fromJson(o: JSONObject) =
            TripOption(o.getString("tripId"), o.getString("service"), o.getString("startTime"))
    }
}

private val SERVICE_LABELS = mapOf("weekday" to "Mo-Fr", "saturday" to "Sa", "schoolday" to "Schultag")

/** Analog zu api/src/tripTimeline.ts's tripOptionLabel(). */
fun TripOption.label(): String = "${SERVICE_LABELS[service] ?: service} ${startTime.take(5)}"

data class TimelineStop(
    val stopId: String,
    val name: String,
    val time: String?,
    val note: String?,
    val isFirst: Boolean,
    val isLast: Boolean,
    val dropOffOnly: Boolean
) {
    companion object {
        fun fromJson(o: JSONObject) = TimelineStop(
            o.getString("stopId"),
            o.getString("name"),
            if (o.has("time") && !o.isNull("time")) o.getString("time") else null,
            if (o.has("note") && !o.isNull("note")) o.getString("note") else null,
            o.getBoolean("isFirst"),
            o.getBoolean("isLast"),
            o.optBoolean("dropOffOnly", false)
        )
    }
}
