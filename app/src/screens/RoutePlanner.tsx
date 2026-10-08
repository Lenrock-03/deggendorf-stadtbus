import { useState } from "react";
import { useSchedule } from "../lib/useSchedule";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";
import StopPicker from "../components/StopPicker";
import JourneyCard from "../components/JourneyCard";
import Icon from "../components/Icon";
import { findJourneys, type Journey } from "../lib/routePlanner";
import { fetchJourneysOnline } from "../lib/journeysClient";
import { dateInBerlin, nowMinutesInBerlin } from "../lib/time";

type ResultsSource = "online" | "offline-fallback";

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function RoutePlanner() {
  const schedule = useSchedule();
  const [originId, setOriginId] = useState("");
  const [destId, setDestId] = useState("");
  const [date, setDate] = useState(() => toDateInputValue(dateInBerlin()));
  const [time, setTime] = useState(() => toTimeInputValue(nowMinutesInBerlin()));
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [resultsSource, setResultsSource] = useState<ResultsSource | null>(null);

  async function search() {
    if (schedule.status !== "ready") return;
    setSearched(true);
    setSearching(true);
    const [h, m] = time.split(":").map(Number);
    const afterMin = h * 60 + m;
    try {
      const online = await fetchJourneysOnline(originId, destId, date, afterMin);
      setJourneys(online);
      setResultsSource("online");
    } catch {
      // Motis/api/ nicht erreichbar (oder zu langsam) - auf die lokale Berechnung
      // zurückfallen, die direkt auf den bereits geladenen Fahrplandaten arbeitet.
      const [y, mo, d] = date.split("-").map(Number);
      const offline = findJourneys(schedule.data, originId, destId, new Date(y, mo - 1, d), afterMin);
      setJourneys(offline);
      setResultsSource("offline-fallback");
    } finally {
      setSearching(false);
    }
  }

  if (schedule.status === "loading") return <LoadingBanner />;
  if (schedule.status === "error") return <ErrorBanner message={schedule.error} />;

  const sameStop = !!originId && !!destId && originId === destId;

  return (
    <section>
      <h2>Verbindung suchen</h2>

      <div className="card route-planner-form">
        <StopPicker
          label="Von"
          placeholder="Starthaltestelle …"
          stops={schedule.data.stops}
          value={originId}
          onChange={(id) => { setOriginId(id); setSearched(false); }}
        />

        <button
          type="button"
          className="swap-button"
          aria-label="Start und Ziel tauschen"
          onClick={() => {
            setOriginId(destId);
            setDestId(originId);
            setSearched(false);
          }}
        >
          <Icon name="swapVertical" size={18} />
        </button>

        <StopPicker
          label="Nach"
          placeholder="Zielhaltestelle …"
          stops={schedule.data.stops}
          value={destId}
          onChange={(id) => { setDestId(id); setSearched(false); }}
        />

        <div className="route-planner-datetime">
          <label>
            Datum
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setSearched(false); }} />
          </label>
          <label>
            Ab Uhrzeit
            <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setSearched(false); }} />
          </label>
        </div>

        <button
          className="primary-button"
          onClick={() => void search()}
          disabled={!originId || !destId || sameStop || searching}
        >
          {searching ? "Suche …" : "Verbindungen suchen"}
        </button>
        {sameStop && <p className="muted" style={{ marginTop: "0.4rem" }}>Start und Ziel dürfen nicht gleich sein.</p>}
      </div>

      {searched && !searching && (
        <>
          {resultsSource === "offline-fallback" && (
            <p className="muted" style={{ marginTop: "1.25rem" }}>
              Offline-Ergebnisse (eigene Berechnung) – evtl. abweichend vom Live-Fahrplan.
            </p>
          )}
          <ul className="card-list" style={{ marginTop: "1.25rem" }}>
            {journeys.length === 0 && (
              <p className="muted">
                Keine Verbindung gefunden (an diesem Tag/zu dieser Zeit kein Verkehr, oder keine Verbindung).
              </p>
            )}
            {journeys.map((j, i) => (
              <JourneyCard key={i} journey={j} bundle={schedule.data} />
            ))}
          </ul>
        </>
      )}

      <p className="muted" style={{ marginTop: "1.5rem" }}>
        Findet Direktverbindungen und Verbindungen mit einmal Umsteigen. Kein Verkehr an Sonn-/Feiertagen.
      </p>
    </section>
  );
}
