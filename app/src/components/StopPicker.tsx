import { useEffect, useMemo, useRef, useState } from "react";
import type { StopData } from "../types/data";
import { stopMatchesQuery } from "../lib/stopAliases";
import { useAddressSearch } from "../lib/useAddressSearch";
import { stopsWithinRadius, formatDistance, type StopWithDistance } from "../lib/geo";
import Icon from "./Icon";

/** Fußweg-Radius für "Haltestellen in der Nähe einer Adresse" - deckt die meisten Fälle ab,
 * ohne bei einer zentral gelegenen Adresse gleich ein Dutzend Haltestellen aufzulisten. */
const ADDRESS_STOP_RADIUS_M = 500;

interface StopPickerProps {
  stops: StopData[];
  value: string;
  onChange: (stopId: string) => void;
  placeholder?: string;
  label: string;
}

/** Durchsuchbares Eingabefeld für eine Haltestelle ODER eine beliebige Adresse in Deggendorf
 * (Autocomplete). Eine ausgewählte Adresse wird geocodiert (siehe geocode.ts) und zeigt
 * anschließend alle Haltestellen im Fußweg-Radius (ADDRESS_STOP_RADIUS_M) zur Auswahl - der
 * Routenplaner selbst kennt weiterhin nur Haltestellen-IDs, `onChange` liefert also immer
 * eine solche, nie eine Adresse direkt. */
export default function StopPicker({ stops, value, onChange, placeholder, label }: StopPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [resolvedNote, setResolvedNote] = useState<string | null>(null);
  // Nach Auswahl einer Adresse: alle Haltestellen in deren Umkreis, aus denen noch gewählt
  // werden muss - ersetzt bis zur Auswahl die normale Haltestellen-/Adress-Vorschlagsliste.
  const [nearbyStops, setNearbyStops] = useState<{ addressLabel: string; stops: StopWithDistance[] } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Hält fest, welchen `value` wir selbst zuletzt über onChange gesetzt haben - so weiß der
  // Sync-Effekt unten, ob eine `value`-Änderung von außen kam (z.B. Tauschen-Button, dann
  // Anzeige auf den Haltestellennamen zurücksetzen) oder von uns selbst (dann `query`/
  // `resolvedNote` unangetastet lassen, sonst würde eine gewählte Adresse sofort wieder
  // durch den Namen der aufgelösten Haltestelle überschrieben).
  const lastAppliedValue = useRef<string>("");

  useEffect(() => {
    if (value === lastAppliedValue.current) return;
    const stop = stops.find((s) => s.id === value);
    setQuery(stop ? stop.name : "");
    setResolvedNote(null);
    setNearbyStops(null);
    lastAppliedValue.current = value;
  }, [value, stops]);

  const stopResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return stops.filter((s) => stopMatchesQuery(s.name, q)).slice(0, 8);
  }, [stops, query]);

  // Adresssuche nur, wenn die Eingabe (noch) keine bereits ausgewählte Haltestelle/Adresse
  // ist - vermeidet einen unnötigen Nachschlag direkt nach einer Auswahl bzw. während schon
  // die Haltestellen-im-Umkreis-Liste einer gewählten Adresse angezeigt wird.
  const address = useAddressSearch(query, open && !nearbyStops);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectStop(s: StopData) {
    lastAppliedValue.current = s.id;
    onChange(s.id);
    setQuery(s.name);
    setResolvedNote(null);
    setNearbyStops(null);
    setOpen(false);
  }

  // Adresse gewählt -> noch keine Haltestelle festlegen, sondern erst alle im Umkreis zur
  // Auswahl anbieten (siehe selectNearbyStop) statt stillschweigend nur die eine
  // nächstgelegene zu übernehmen.
  function selectAddress(addressLabel: string, lat: number, lon: number) {
    const nearby = stopsWithinRadius(stops, lat, lon, ADDRESS_STOP_RADIUS_M);
    if (nearby.length === 0) {
      setResolvedNote(
        `Keine Haltestelle im Umkreis von ${formatDistance(ADDRESS_STOP_RADIUS_M)} um "${addressLabel}" gefunden.`
      );
      return;
    }
    setQuery(addressLabel);
    setResolvedNote(null);
    setNearbyStops({ addressLabel, stops: nearby });
  }

  function selectNearbyStop(s: StopWithDistance) {
    lastAppliedValue.current = s.id;
    onChange(s.id);
    setQuery(s.name);
    setResolvedNote(`→ Adresse: ${nearbyStops?.addressLabel}`);
    setNearbyStops(null);
    setOpen(false);
  }

  const showNoStopMatches = query.trim().length > 0 && stopResults.length === 0;

  return (
    <div className="stop-picker" ref={containerRef}>
      <label className="stop-picker-label">
        {label}
        <input
          type="text"
          className="stop-search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResolvedNote(null);
            setNearbyStops(null);
            setOpen(true);
            if (value) onChange(""); // getippt, ohne dass schon wieder etwas ausgewählt ist
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      </label>
      {open && nearbyStops && (
        <ul className="stop-picker-suggestions">
          <li className="stop-picker-group-label">Haltestellen nahe "{nearbyStops.addressLabel}"</li>
          {nearbyStops.stops.map((s) => (
            <li key={s.id}>
              <button type="button" className="stop-picker-nearby-option" onClick={() => selectNearbyStop(s)}>
                <span>{s.name}</span>
                <span className="muted">{formatDistance(s.distanceM)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !nearbyStops && (stopResults.length > 0 || address.results.length > 0) && (
        <ul className="stop-picker-suggestions">
          {stopResults.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => selectStop(s)}>
                {s.name}
              </button>
            </li>
          ))}
          {address.results.length > 0 && (
            <>
              {stopResults.length > 0 && <li className="stop-picker-group-label">Adressen</li>}
              {address.results.map((a, i) => (
                <li key={`${a.lat},${a.lon},${i}`}>
                  <button
                    type="button"
                    className="stop-picker-address-option"
                    onClick={() => selectAddress(a.label, a.lat, a.lon)}
                  >
                    <Icon name="location" size={16} />
                    <span>{a.label}</span>
                  </button>
                </li>
              ))}
            </>
          )}
        </ul>
      )}
      {open && !nearbyStops && showNoStopMatches && address.results.length === 0 && (
        <ul className="stop-picker-suggestions">
          <li className="muted" style={{ padding: "0.5rem 0.75rem" }}>
            {address.loading ? "Suche Adresse …" : "Keine Haltestelle oder Adresse gefunden"}
          </li>
        </ul>
      )}
      {resolvedNote && <p className="muted stop-picker-resolved-note">{resolvedNote}</p>}
    </div>
  );
}
