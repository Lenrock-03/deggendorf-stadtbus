import { NavLink } from "react-router-dom";
import Icon, { type IconName } from "./Icon";

const TABS: { to: string; icon: IconName; label: string; end?: boolean }[] = [
  { to: "/", icon: "bus", label: "Linien", end: true },
  { to: "/suche", icon: "search", label: "Suche" },
  { to: "/karte", icon: "map", label: "Karte" },
  { to: "/verbindung", icon: "swap", label: "Verbindung" },
];

/** Material-Design-artige Bottom-Tab-Bar (ersetzt die vorherige Nav-Pill-Leiste im Header). */
export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className="bottom-nav-item">
          <span className="bottom-nav-icon">
            <Icon name={tab.icon} />
          </span>
          <span className="bottom-nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
