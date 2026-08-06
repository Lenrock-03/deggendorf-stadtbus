import { Link } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import LineBadge from "../components/LineBadge";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";

export default function LineOverview() {
  const schedule = useSchedule();

  if (schedule.status === "loading") return <LoadingBanner />;
  if (schedule.status === "error") return <ErrorBanner message={schedule.error} />;

  const { routes } = schedule.data;

  return (
    <section>
      <h2>Linien</h2>
      <ul className="card-list">
        {routes.map((route) => (
          <li key={route.id} className="card">
            <Link to={`/linie/${route.id}`} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <LineBadge route={route} />
              <span>{route.longName}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!routes.some((r) => r.id === "2") && (
        <p className="muted" style={{ marginTop: "1rem" }}>
          Linie 2 (Hirzau – Rörerstraße) hat mehrere Verzweigungen und Schultag-Sonderfahrten und wird
          in einer späteren Version ergänzt. Aktueller Fahrplan:{" "}
          <a
            href="https://www.deggendorf.de/leben/mobilitaet-verkehr/stadtbusverkehr"
            target="_blank"
            rel="noreferrer"
          >
            deggendorf.de
          </a>
          .
        </p>
      )}
    </section>
  );
}
