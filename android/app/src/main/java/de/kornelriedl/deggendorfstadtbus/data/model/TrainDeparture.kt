package de.kornelriedl.deggendorfstadtbus.data.model

import org.json.JSONObject

data class TrainDeparture(
    val tripId: String,
    val line: String,
    val destination: String,
    val plannedTime: String,
    val actualTime: String,
    val delayMin: Int,
    val cancelled: Boolean,
    val platform: String?
) {
    companion object {
        fun fromJson(o: JSONObject) = TrainDeparture(
            o.getString("tripId"),
            o.getString("line"),
            o.optString("destination", ""),
            o.getString("plannedTime"),
            o.getString("actualTime"),
            o.optInt("delayMin", 0),
            o.optBoolean("cancelled", false),
            if (o.has("platform") && !o.isNull("platform")) o.getString("platform") else null
        )
    }
}
