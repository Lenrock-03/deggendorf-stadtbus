import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";
import LineBadge from "../components/LineBadge";
import FavoriteButton from "../components/FavoriteButton";
import { departuresForDate, nextDepartures } from "../lib/calendar";
import { dateInBerlin } from "../lib/time";

function toInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromInputValue(v: string): Date {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function StopBoard() {
  const { id } = useParams<{ id: string }>();
  const schedule = useSchedule();
  const [mode, setMode] = useState<"now" | "day">("now");
  const [selectedDate, setSelectedDate] = useState<string>(() => toInputValue(dateInBerlin()));

  if (schedule.status === "loading") return <LoadingBanner />;
  if (schedule.status === "error") return <ErrorBanner message={schedule.error} />;

  const { stops, departures, calendar, routes } = schedule.data;
  const stop = stops.find((s) => s.id === id);
  const stopDepartures = id ? departures[id] ?? [] : [];

  if (!stop) {
    return <ErrorBanner message={`Haltestelle ${id} wurde nicht gefunden.`} />;
  }

  const routeById = new Map(routes.map((r) => [r.id, r]));

  const shown =
    mode === "now"
      ? nextDepartures(stopDepartures, calendar, new Date(), 12)
      : departuresForDate(stopDepartures, calendar, fromInputValue(selectedDate));

  return (
    <section>
      <p>
        <Link to="/suche">&larr; Andere Haltestelle</Link>
      </p>
      <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {stop.name}
        <FavoriteButton stopId={stop.id} />
      </h2>

      <div role="tablist" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button role="tab" aria-selected={mode === "now"} onClick={() => setMode("now")}>
          Nächste Abfahrten
        </button>
        <button role="tab" aria-selected={mode === "day"} onClick={() => setMode("day")}>
          Nach Datum
        </button>
      </div>

      {mode === "day" && (
        <label style={{ display: "block", marginBottom: "1rem" }}>
          Datum:{" "}
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </label>
      )}

      <div className="card">
        {shown.length === 0 && (
          <p className="muted">
            {mode === "now" ? "Heute keine weiteren Fahrten." : "An diesem Tag kein Verkehr (Sonntag/Feiertag)."}
          </p>
        )}
        {shown.map((d, i) => {
          const route = routeById.get(d.routeId);
          return (
            <Link
              className="departure-row"
              to={`/linie/${d.routeId}?trip=${encodeURIComponent(d.tripId)}`}
              key={`${d.tripId}-${i}`}
            >
              <span className="departure-time">{d.time.slice(0, 5)}</span>
              {route && <LineBadge route={route} />}
              <span>{d.headsign}</span>
              {d.dropOffOnly && <span className="muted">nur Aussteigen</span>}
            </Link>
          );
        })}
      </div>
      <p className="muted" style={{ marginTop: "0.75rem" }}>
        Kein Verkehr an Sonn-/Feiertagen. An Heiligabend/Silvester gilt der Samstagsfahrplan (außer wenn diese auf
        einen Sonntag fallen).
      </p>
    </section>
  );
}
