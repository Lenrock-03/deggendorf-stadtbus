import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";
import { findJourneys, type Journey } from "../lib/routePlanner";
import { dateInBerlin, nowMinutesInBerlin } from "../lib/time";

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function JourneyCard({ journey }: { journey: Journey }) {
  return (
    <li className="card journey-card">
      <div className="journey-summary">
        <strong>
          {journey.departureTime.slice(0, 5)} → {journey.arrivalTime.slice(0, 5)}
        </strong>
        <span className="muted">{journey.legs.length === 1 ? "direkt" : "1x umsteigen"}</span>
      </div>
      {journey.legs.map((leg, i) => (
        <div key={i} className="journey-leg">
          <span className="line-badge" style={{ backgroundColor: `#${leg.routeColor}` }}>
            {leg.routeShortName}
          </span>
          <span>
            <Link to={`/haltestelle/${leg.boardStopId}`}>{leg.boardStopName}</Link> ({leg.boardTime.slice(0, 5)}) →{" "}
            <Link to={`/haltestelle/${leg.alightStopId}`}>{leg.alightStopName}</Link> ({leg.alightTime.slice(0, 5)})
          </span>
        </div>
      ))}
      {journey.transferWaitMin != null && (
        <p className="muted" style={{ margin: "0.3rem 0 0" }}>
          Umstiegszeit: {journey.transferWaitMin} Min.
        </p>
      )}
    </li>
  );
}

export default function RoutePlanner() {
  const schedule = useSchedule();
  const [originId, setOriginId] = useState("");
  const [destId, setDestId] = useState("");
  const [date, setDate] = useState(() => toDateInputValue(dateInBerlin()));
  const [time, setTime] = useState(() => toTimeInputValue(nowMinutesInBerlin()));
  const [searched, setSearched] = useState(false);

  const journeys = useMemo(() => {
    if (schedule.status !== "ready" || !originId || !destId || !searched) return [];
    const [h, m] = time.split(":").map(Number);
    const [y, mo, d] = date.split("-").map(Number);
    return findJourneys(schedule.data, originId, destId, new Date(y, mo - 1, d), h * 60 + m);
  }, [schedule, originId, destId, date, time, searched]);

  if (schedule.status === "loading") return <LoadingBanner />;
  if (schedule.status === "error") return <ErrorBanner message={schedule.error} />;

  const sortedStops = schedule.data.stops.slice().sort((a, b) => a.name.localeCompare(b.name, "de"));

  return (
    <section>
      <h2>Verbindung suchen</h2>

      <label style={{ display: "block", marginBottom: "0.6rem" }}>
        Von:{" "}
        <select value={originId} onChange={(e) => { setOriginId(e.target.value); setSearched(false); }}>
          <option value="">— Starthaltestelle wählen —</option>
          {sortedStops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <div style={{ margin: "0.4rem 0" }}>
        <button
          type="button"
          aria-label="Start und Ziel tauschen"
          onClick={() => {
            setOriginId(destId);
            setDestId(originId);
            setSearched(false);
          }}
        >
          ⇅ Tauschen
        </button>
      </div>

      <label style={{ display: "block", marginBottom: "0.6rem" }}>
        Nach:{" "}
        <select value={destId} onChange={(e) => { setDestId(e.target.value); setSearched(false); }}>
          <option value="">— Zielhaltestelle wählen —</option>
          {sortedStops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label style={{ marginRight: "1rem" }}>
        Datum: <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setSearched(false); }} />
      </label>
      <label>
        Ab Uhrzeit: <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setSearched(false); }} />
      </label>

      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={() => setSearched(true)}
          disabled={!originId || !destId || originId === destId}
        >
          Verbindungen suchen
        </button>
        {originId && destId && originId === destId && (
          <p className="muted" style={{ marginTop: "0.4rem" }}>
            Start und Ziel dürfen nicht gleich sein.
          </p>
        )}
      </div>

      {searched && (
        <ul className="card-list" style={{ marginTop: "1.25rem" }}>
          {journeys.length === 0 && (
            <p className="muted">
              Keine Verbindung gefunden (an diesem Tag/zu dieser Zeit kein Verkehr, oder keine Verbindung mit
              höchstens einmal Umsteigen).
            </p>
          )}
          {journeys.map((j, i) => (
            <JourneyCard key={i} journey={j} />
          ))}
        </ul>
      )}

      <p className="muted" style={{ marginTop: "1.5rem" }}>
        Findet Direktverbindungen und Verbindungen mit einmal Umsteigen. Kein Verkehr an Sonn-/Feiertagen.
      </p>
    </section>
  );
}
