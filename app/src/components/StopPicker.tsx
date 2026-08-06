import { useEffect, useMemo, useRef, useState } from "react";
import type { StopData } from "../types/data";
import { stopMatchesQuery } from "../lib/stopAliases";

interface StopPickerProps {
  stops: StopData[];
  value: string;
  onChange: (stopId: string) => void;
  placeholder?: string;
  label: string;
}

/** Durchsuchbares Eingabefeld für eine Haltestelle (Autocomplete), statt einer langen
 * unsortierten Auswahlliste - gleiche Such-Interaktion wie auf der Haltestellensuche. */
export default function StopPicker({ stops, value, onChange, placeholder, label }: StopPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Wenn sich `value` von außen ändert (z.B. Tauschen-Button), Anzeigetext synchronisieren.
  useEffect(() => {
    const stop = stops.find((s) => s.id === value);
    setQuery(stop ? stop.name : "");
  }, [value, stops]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return stops.filter((s) => stopMatchesQuery(s.name, q)).slice(0, 8);
  }, [stops, query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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
            setOpen(true);
            if (value) onChange(""); // getippt, ohne dass schon wieder etwas ausgewählt ist
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      </label>
      {open && results.length > 0 && (
        <ul className="stop-picker-suggestions">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(s.id);
                  setQuery(s.name);
                  setOpen(false);
                }}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && results.length === 0 && (
        <ul className="stop-picker-suggestions">
          <li className="muted" style={{ padding: "0.5rem 0.75rem" }}>
            Keine Haltestelle gefunden
          </li>
        </ul>
      )}
    </div>
  );
}
