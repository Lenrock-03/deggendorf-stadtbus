import { Link, Outlet } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import InstallButton from "./InstallButton";

export default function Layout() {
  const schedule = useSchedule();

  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          <span aria-hidden="true">🚌</span>
          <h1>Deggendorf Busfahrplan</h1>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link to="/suche">Haltestelle suchen</Link>
          <InstallButton />
        </div>
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
