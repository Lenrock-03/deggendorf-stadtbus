import { Link, NavLink, Outlet } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import InstallButton from "./InstallButton";
import ThemeToggle from "./ThemeToggle";
import Icon from "./Icon";

export default function Layout() {
  const schedule = useSchedule();

  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          <Icon name="bus" size={26} />
          <h1>Deggendorf Busfahrplan</h1>
        </Link>
        <nav className="app-nav">
          <NavLink to="/suche" className="nav-button">
            Haltestelle suchen
          </NavLink>
          <NavLink to="/karte" className="nav-button">
            Karte
          </NavLink>
          <NavLink to="/verbindung" className="nav-button">
            Verbindung suchen
          </NavLink>
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
