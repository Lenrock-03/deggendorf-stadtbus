import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";
import LineBadge from "../components/LineBadge";
import { departuresForWeekday, nextDepartures } from "../lib/calendar";
import { weekdayInBerlin } from "../lib/time";

const WEEKDAY_LABELS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

export default function StopBoard() {
  const { id } = useParams<{ id: string }>();
  const schedule = useSchedule();
  const [mode, setMode] = useState<"now" | "day">("now");
  const [selectedWeekday, setSelectedWeekday] = useState<number>(() => weekdayInBerlin());

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
      : departuresForWeekday(stopDepartures, calendar, selectedWeekday);

  return (
    <section>
      <p>
        <Link to="/suche">&larr; Andere Haltestelle</Link>
      </p>
      <h2>{stop.name}</h2>

      <div role="tablist" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button role="tab" aria-selected={mode === "now"} onClick={() => setMode("now")}>
          Nächste Abfahrten
        </button>
        <button role="tab" aria-selected={mode === "day"} onClick={() => setMode("day")}>
          Nach Wochentag
        </button>
      </div>

      {mode === "day" && (
        <label style={{ display: "block", marginBottom: "1rem" }}>
          Wochentag:{" "}
          <select value={selectedWeekday} onChange={(e) => setSelectedWeekday(Number(e.target.value))}>
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="card">
        {shown.length === 0 && (
          <p className="muted">
            {mode === "now" ? "Heute keine weiteren Fahrten." : "An diesem Wochentag kein Verkehr."}
          </p>
        )}
        {shown.map((d, i) => {
          const route = routeById.get(d.routeId);
          return (
            <div className="departure-row" key={`${d.tripId}-${i}`}>
              <span className="departure-time">{d.time.slice(0, 5)}</span>
              {route && <LineBadge route={route} />}
              <span>{d.headsign}</span>
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ marginTop: "0.75rem" }}>
        Hinweis: kein Verkehr an Sonn-/Feiertagen. An Heiligabend/Silvester gilt der Samstagsfahrplan (außer wenn diese auf einen Sonntag fallen).
      </p>
    </section>
  );
}
