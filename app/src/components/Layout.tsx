import { Link, NavLink, Outlet } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import InstallButton from "./InstallButton";
import ThemeToggle from "./ThemeToggle";
import BottomNav from "./BottomNav";
import Icon from "./Icon";

const isCapacitor = import.meta.env.VITE_CAPACITOR === "1";

export default function Layout() {
  const schedule = useSchedule();

  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          <Icon name="bus" size={26} />
          <h1>Deggendorf Busfahrplan</h1>
        </Link>
        {isCapacitor ? (
          // Native App: Navigation läuft über die BottomNav weiter unten, Header zeigt nur
          // Marke + die zwei Utility-Buttons.
          <div className="app-header-actions">
            <ThemeToggle />
            <InstallButton />
          </div>
        ) : (
          // Web-App: bewusst bei der Top-Nav-Leiste geblieben (siehe Nutzer-Feedback) -
          // BottomNav ist nur für die native Android-App gedacht.
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
        )}
      </header>
      <main className={isCapacitor ? "app-main app-main-with-bottom-nav" : "app-main"}>
        <Outlet />
        {schedule.status === "ready" && (
          <footer className="attribution muted">
            <p>{schedule.data.meta.disclaimer}</p>
            <p>{schedule.data.meta.attribution}</p>
          </footer>
        )}
      </main>
      {isCapacitor && <BottomNav />}
    </>
  );
}
