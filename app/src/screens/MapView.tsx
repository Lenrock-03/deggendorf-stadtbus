import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSchedule } from "../lib/useSchedule";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";
import { useFavoriteIds } from "../lib/favorites";

// Deggendorf-Zentrum als Kartenmitte, wenn (noch) keine Haltestellen bekannt sind.
const DEGGENDORF_CENTER: [number, number] = [48.8385, 12.9595];

function dotIcon(color: string, size = 12): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.6);"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function MapView() {
  const schedule = useSchedule();
  const [searchParams] = useSearchParams();
  const favoriteIds = useFavoriteIds();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  const routeFilter = searchParams.get("linie");

  useEffect(() => {
    if (schedule.status !== "ready" || !mapRef.current) return;
    const { stops, routeStops } = schedule.data;

    const filteredStopIds = routeFilter ? new Set(routeStops[routeFilter]?.map((s) => s.stopId) ?? []) : null;
    const visibleStops = stops.filter(
      (s) => s.lat != null && s.lon != null && (!filteredStopIds || filteredStopIds.has(s.id))
    );

    const map = L.map(mapRef.current, { zoomControl: true }).setView(DEGGENDORF_CENTER, 14);
    leafletMap.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
      maxZoom: 19,
    }).addTo(map);

    const favIconColor = "#f59e0b";
    const normalIconColor = "#1d4ed8";

    for (const s of visibleStops) {
      const isFav = favoriteIds.includes(s.id);
      const marker = L.marker([s.lat!, s.lon!], { icon: dotIcon(isFav ? favIconColor : normalIconColor) }).addTo(map);
      // Normaler <a href>, kein SPA-clientseitiges Routing hier nötig - der Klick lädt
      // die Seite neu, was über die nginx-SPA-Fallback-Config (siehe nginx.conf) bzw. den
      // Vite-Dev-Server korrekt auf /haltestelle/:id auflöst.
      marker.bindPopup(`<strong>${s.name}</strong><br/><a href="/haltestelle/${s.id}">Abfahrten ansehen</a>`);
    }

    if (visibleStops.length > 0) {
      const bounds = L.latLngBounds(visibleStops.map((s) => [s.lat!, s.lon!] as [number, number]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    return () => {
      map.remove();
      leafletMap.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, routeFilter]);

  if (schedule.status === "loading") return <LoadingBanner />;
  if (schedule.status === "error") return <ErrorBanner message={schedule.error} />;

  const missingCoords = schedule.data.stops.filter((s) => s.lat == null).length;

  return (
    <section>
      <h2>Karte</h2>
      <div className="map-fullwidth">
        <div ref={mapRef} style={{ height: "calc(100vh - 12rem)", minHeight: "22rem" }} />
      </div>
      {missingCoords > 0 && (
        <p className="muted" style={{ marginTop: "0.6rem" }}>
          {missingCoords} Haltestellen ohne bekannte Koordinaten werden nicht angezeigt.
        </p>
      )}
    </section>
  );
}
