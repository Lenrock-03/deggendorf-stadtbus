import { Link } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import LineBadge from "../components/LineBadge";
import FavoriteButton from "../components/FavoriteButton";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";
import { useFavoriteIds } from "../lib/favorites";

export default function LineOverview() {
  const schedule = useSchedule();
  const favoriteIds = useFavoriteIds();

  if (schedule.status === "loading") return <LoadingBanner />;
  if (schedule.status === "error") return <ErrorBanner message={schedule.error} />;

  const { routes, stops } = schedule.data;
  const favoriteStops = favoriteIds
    .map((id) => stops.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <section>
      {favoriteStops.length > 0 && (
        <>
          <h2>Favoriten</h2>
          <ul className="card-list" style={{ marginBottom: "1.5rem" }}>
            {favoriteStops.map((s) => (
              <li key={s.id} className="card" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Link to={`/haltestelle/${s.id}`} style={{ flex: 1 }}>
                  {s.name}
                </Link>
                <FavoriteButton stopId={s.id} />
              </li>
            ))}
          </ul>
        </>
      )}

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
    </section>
  );
}
