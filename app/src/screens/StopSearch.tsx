import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";

export default function StopSearch() {
  const schedule = useSchedule();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (schedule.status !== "ready") return [];
    const q = query.trim().toLowerCase();
    const { stops } = schedule.data;
    if (!q) return stops.slice(0, 20);
    return stops.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 30);
  }, [schedule, query]);

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
      <ul className="card-list" style={{ marginTop: "1rem" }}>
        {results.map((s) => (
          <li key={s.id} className="card">
            <Link to={`/haltestelle/${s.id}`}>{s.name}</Link>
          </li>
        ))}
        {results.length === 0 && <p className="muted">Keine Haltestelle gefunden.</p>}
      </ul>
    </section>
  );
}
