import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";
import { distanceMeters, formatDistance } from "../lib/geo";
import { useAddressSearch } from "../lib/useAddressSearch";
import FavoriteButton from "../components/FavoriteButton";
import Icon from "../components/Icon";
import { stopMatchesQuery } from "../lib/stopAliases";

type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; lat: number; lon: number; source: "gps" | "address"; label?: string }
  | { status: "error"; message: string };

function geoErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Standortzugriff wurde verweigert. Du kannst das in den Website-Einstellungen deines Browsers wieder erlauben.";
    case err.POSITION_UNAVAILABLE:
      return "Standort konnte nicht ermittelt werden.";
    case err.TIMEOUT:
      return "Zeitüberschreitung beim Ermitteln des Standorts.";
    default:
      return "Standort konnte nicht ermittelt werden.";
  }
}

export default function StopSearch() {
  const schedule = useSchedule();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<LocationState>({ status: "idle" });

  const [addressQuery, setAddressQuery] = useState("");
  const [addressOpen, setAddressOpen] = useState(false);
  const addressBoxRef = useRef<HTMLDivElement>(null);
  const address = useAddressSearch(addressQuery, addressOpen);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (addressBoxRef.current && !addressBoxRef.current.contains(e.target as Node)) {
        setAddressOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setLocation({ status: "error", message: "Dieser Browser unterstützt keine Standortermittlung." });
      return;
    }
    setLocation({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ status: "ready", lat: pos.coords.latitude, lon: pos.coords.longitude, source: "gps" }),
      (err) => setLocation({ status: "error", message: geoErrorMessage(err) }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function selectAddress(label: string, lat: number, lon: number) {
    setLocation({ status: "ready", lat, lon, source: "address", label });
    setAddressQuery(label);
    setAddressOpen(false);
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

      <div style={{ marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <button
          onClick={useMyLocation}
          disabled={location.status === "loading"}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
        >
          <Icon name="location" size={18} />
          {location.status === "loading" ? "Standort wird ermittelt …" : "Standort verwenden"}
        </button>
        <span className="muted">oder</span>
        <div className="stop-picker" ref={addressBoxRef} style={{ minWidth: "16rem", flex: "1 1 16rem" }}>
          <input
            type="text"
            className="stop-search-input"
            aria-label="Adresse eingeben"
            placeholder="Adresse eingeben, z.B. Ringstraße 5 …"
            value={addressQuery}
            onChange={(e) => {
              setAddressQuery(e.target.value);
              setAddressOpen(true);
              if (location.status === "ready" && location.source === "address") setLocation({ status: "idle" });
            }}
            onFocus={() => setAddressOpen(true)}
            autoComplete="off"
          />
          {addressOpen && address.results.length > 0 && (
            <ul className="stop-picker-suggestions">
              {address.results.map((a, i) => (
                <li key={`${a.lat},${a.lon},${i}`}>
                  <button type="button" onClick={() => selectAddress(a.label, a.lat, a.lon)}>
                    {a.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {addressOpen && addressQuery.trim().length >= 3 && address.results.length === 0 && (
            <ul className="stop-picker-suggestions">
              <li className="muted" style={{ padding: "0.5rem 0.75rem" }}>
                {address.loading ? "Suche Adresse …" : "Keine Adresse gefunden"}
              </li>
            </ul>
          )}
        </div>
      </div>

      {location.status === "error" && (
        <p className="muted" style={{ marginTop: "0.4rem" }}>
          {location.message}
        </p>
      )}
      {location.status === "ready" && (
        <p className="muted" style={{ marginTop: "0.4rem" }}>
          Sortiert nach Entfernung zu {location.source === "address" ? `„${location.label}“` : "deinem Standort"}.
        </p>
      )}

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
