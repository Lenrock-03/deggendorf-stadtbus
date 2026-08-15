package de.kornelriedl.deggendorfstadtbus.ui.screens

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import de.kornelriedl.deggendorfstadtbus.data.model.StopData
import de.kornelriedl.deggendorfstadtbus.ui.Loadable
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

// Deggendorf-Zentrum als Fallback, solange noch keine Haltestellen geladen sind (gleicher
// Wert wie MapView.tsx's DEGGENDORF_CENTER).
private val DEGGENDORF_CENTER = GeoPoint(48.8385, 12.9595)

@Composable
fun MapScreen(
    modifier: Modifier = Modifier,
    stops: Loadable<List<StopData>>,
    favoriteIds: Set<String>,
    onStopClick: (StopData) -> Unit
) {
    when (stops) {
        is Loadable.Loading -> CircularProgressIndicator()
        is Loadable.Error -> Text("Fehler: ${stops.message}")
        is Loadable.Ready -> {
            val located = remember(stops.data) { stops.data.filter { it.lat != null && it.lon != null } }
            AndroidView(
                modifier = modifier.fillMaxSize(),
                factory = { context ->
                    MapView(context).apply {
                        setMultiTouchControls(true)
                        controller.setZoom(14.0)
                        controller.setCenter(DEGGENDORF_CENTER)
                    }
                },
                update = { mapView ->
                    mapView.overlays.clear()
                    val points = mutableListOf<GeoPoint>()
                    for (stop in located) {
                        val point = GeoPoint(stop.lat!!, stop.lon!!)
                        points.add(point)
                        val marker = Marker(mapView).apply {
                            position = point
                            title = stop.name
                            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                            setOnMarkerClickListener { _, _ ->
                                onStopClick(stop)
                                true
                            }
                        }
                        mapView.overlays.add(marker)
                    }
                    // zoomToBoundingBox() VOR dem ersten Layout-Pass aufzurufen (Breite/Höhe
                    // der View noch 0) kann osmdroid beim Zoomstufen-Suchen hängen lassen -
                    // bekannte Falle, hat hier eine ANR ausgelöst. Über post() auf den
                    // nächsten Layout-Durchlauf verschieben und Größe vorher prüfen.
                    if (points.isNotEmpty()) {
                        val bbox = org.osmdroid.util.BoundingBox.fromGeoPoints(points)
                        mapView.post {
                            if (mapView.width > 0 && mapView.height > 0) {
                                mapView.zoomToBoundingBox(bbox, false, 60)
                            }
                        }
                    }
                    mapView.invalidate()
                }
            )
        }
    }
}
