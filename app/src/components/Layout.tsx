import { Link, Outlet } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import InstallButton from "./InstallButton";
import ThemeToggle from "./ThemeToggle";

export default function Layout() {
  const schedule = useSchedule();

  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          <span aria-hidden="true">🚌</span>
          <h1>Deggendorf Busfahrplan</h1>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link to="/suche">Haltestelle suchen</Link>
          <Link to="/karte">Karte</Link>
          <Link to="/verbindung">Verbindung suchen</Link>
          <ThemeToggle />
          <InstallButton />
        </nav>
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
