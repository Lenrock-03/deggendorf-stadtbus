import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Geolocation } from "@capacitor/geolocation";
import { useSchedule } from "../lib/useSchedule";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";
import { distanceMeters, formatDistance } from "../lib/geo";
import FavoriteButton from "../components/FavoriteButton";
import Icon from "../components/Icon";
import { stopMatchesQuery } from "../lib/stopAliases";

type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; lat: number; lon: number }
  | { status: "error"; message: string };

// @capacitor/geolocation läuft im Web über die Browser-Geolocation-API (wirft dort die
// echte GeolocationPositionError mit .code/.PERMISSION_DENIED etc.), im Capacitor-Android-
// Build dagegen über den nativen Permission-Dialog (wirft dort nur ein Objekt mit .message,
// z.B. "User denied Geolocation permission") - daher hier beide Fehlerformen abfangen statt
// nur den Browser-Fall.
function geoErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && "PERMISSION_DENIED" in err) {
    const e = err as GeolocationPositionError;
    switch (e.code) {
      case e.PERMISSION_DENIED:
        return "Standortzugriff wurde verweigert. Du kannst das in den Einstellungen wieder erlauben.";
      case e.POSITION_UNAVAILABLE:
        return "Standort konnte nicht ermittelt werden.";
      case e.TIMEOUT:
        return "Zeitüberschreitung beim Ermitteln des Standorts.";
    }
  }
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    if (/denied/i.test(err.message)) {
      return "Standortzugriff wurde verweigert. Du kannst das in den Einstellungen wieder erlauben.";
    }
  }
  return "Standort konnte nicht ermittelt werden.";
}

export default function StopSearch() {
  const schedule = useSchedule();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<LocationState>({ status: "idle" });

  async function useMyLocation() {
    setLocation({ status: "loading" });
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      setLocation({ status: "ready", lat: pos.coords.latitude, lon: pos.coords.longitude });
    } catch (err) {
      setLocation({ status: "error", message: geoErrorMessage(err) });
    }
  }

  const results = useMemo(() => {
    if (schedule.status !== "ready") return [];
    const q = query.trim().toLowerCase();
    const { stops } = schedule.data;
    const filtered = q ? stops.filter((s) => stopMatchesQuery(s.name, q)) : stops;

    if (location.status === "ready") {
      const { lat, lon } = location;
      return filtered
        .map((s) => ({
          ...s,
          distanceM: s.lat != null && s.lon != null ? distanceMeters(lat, lon, s.lat, s.lon) : null,
        }))
        .sort((a, b) => {
          if (a.distanceM == null && b.distanceM == null) return 0;
          if (a.distanceM == null) return 1;
          if (b.distanceM == null) return -1;
          return a.distanceM - b.distanceM;
        })
        .slice(0, q ? 30 : 20);
    }

    return filtered.slice(0, q ? 30 : 20).map((s) => ({ ...s, distanceM: null as number | null }));
  }, [schedule, query, location]);

  if (schedule.status === "loading") return <LoadingBanner />;
  if (schedule.status === "error") return <ErrorBanner message={schedule.error} />;

  return (
    <section>
      <h2>Haltestelle suchen</h2>
      <input
        className="stop-search-input"
        type="search"
        aria-label="Haltestelle suchen"
        placeholder="z.B. Klinikum, Busbahnhof, Luitpoldplatz …"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div style={{ marginTop: "0.6rem" }}>
        <button
          onClick={useMyLocation}
          disabled={location.status === "loading"}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
        >
          <Icon name="location" size={18} />
          {location.status === "loading" ? "Standort wird ermittelt …" : "Standort verwenden"}
        </button>
        {location.status === "error" && (
          <p className="muted" style={{ marginTop: "0.4rem" }}>
            {location.message}
          </p>
        )}
        {location.status === "ready" && (
          <p className="muted" style={{ marginTop: "0.4rem" }}>
            Sortiert nach Entfernung zu deinem Standort.
          </p>
        )}
      </div>

      <ul className="card-list" style={{ marginTop: "1rem" }}>
        {results.map((s) => (
          <li key={s.id} className="card" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link
              to={`/haltestelle/${s.id}`}
              style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flex: 1 }}
            >
              <span>{s.name}</span>
              {s.distanceM != null && <span className="muted">{formatDistance(s.distanceM)}</span>}
            </Link>
            <FavoriteButton stopId={s.id} />
          </li>
        ))}
        {results.length === 0 && <p className="muted">Keine Haltestelle gefunden.</p>}
      </ul>
    </section>
  );
}
