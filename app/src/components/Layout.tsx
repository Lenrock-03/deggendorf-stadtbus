import { Link, Outlet } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";

export default function Layout() {
  const schedule = useSchedule();

  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          <span aria-hidden="true">🚌</span>
          <h1>Deggendorf Busfahrplan</h1>
        </Link>
        <Link to="/suche">Haltestelle suchen</Link>
      </header>
      <main className="app-main">
        <Outlet />
        {schedule.status === "ready" && (
          <footer className="attribution muted">
            <p>{schedule.data.meta.disclaimer}</p>
            <p>{schedule.data.meta.attribution}</p>
          </footer>
        )}
      </main>
    </>
  );
}
