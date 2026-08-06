import { Link, useParams } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import LineBadge from "../components/LineBadge";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";

export default function LineDetail() {
  const { id } = useParams<{ id: string }>();
  const schedule = useSchedule();

  if (schedule.status === "loading") return <LoadingBanner />;
  if (schedule.status === "error") return <ErrorBanner message={schedule.error} />;

  const { routes, routeStops } = schedule.data;
  const route = routes.find((r) => r.id === id);
  const stopSequence = id ? routeStops[id] : undefined;

  if (!route || !stopSequence) {
    return <ErrorBanner message={`Linie ${id} wurde nicht gefunden.`} />;
  }

  return (
    <section>
      <p>
        <Link to="/">&larr; Alle Linien</Link>
      </p>
      <h2 style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <LineBadge route={route} />
        {route.longName}
      </h2>
      <ol className="card-list" style={{ listStyle: "none" }}>
        {stopSequence.map((s, i) => (
          <li key={`${s.stopId}-${i}`} className="card">
            <Link to={`/haltestelle/${s.stopId}`} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{s.name}</span>
              {s.note && <span className="muted">{s.note}</span>}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
