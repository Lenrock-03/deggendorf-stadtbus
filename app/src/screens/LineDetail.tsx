import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import LineBadge from "../components/LineBadge";
import TripTimeline from "../components/TripTimeline";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";
import { routeOutline, timelineDurationMin, timelineForTrip, tripOptionLabel, tripsForRoute } from "../lib/tripTimeline";

export default function LineDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const schedule = useSchedule();

  const trips = useMemo(() => (schedule.status === "ready" && id ? tripsForRoute(schedule.data, id) : []), [schedule, id]);

  if (schedule.status === "loading") return <LoadingBanner />;
  if (schedule.status === "error") return <ErrorBanner message={schedule.error} />;

  const { routes } = schedule.data;
  const route = routes.find((r) => r.id === id);

  if (!route || !id) {
    return <ErrorBanner message={`Linie ${id} wurde nicht gefunden.`} />;
  }

  // Nur eine Abfahrt anzeigen, wenn sie explizit gewählt wurde (Link von der Abfahrtstafel
  // einer Haltestelle, oder manuell im Dropdown) - beim Einstieg über die Linienübersicht
  // gibt es noch keine Uhrzeit, nur den reinen Streckenverlauf.
  const urlTripId = searchParams.get("trip");
  const tripId = urlTripId && trips.some((t) => t.tripId === urlTripId) ? urlTripId : null;

  const timeline = tripId ? timelineForTrip(schedule.data, id, tripId) : routeOutline(schedule.data, id);
  const duration = tripId ? timelineDurationMin(timeline) : null;

  return (
    <section>
      <p>
        <Link to="/">&larr; Alle Linien</Link>
      </p>

      <div className="trip-header">
        <LineBadge route={route} />
        <strong>{route.longName}</strong>
      </div>
      {duration != null && timeline.length > 0 && (
        <p className="trip-header-sub">
          {duration} Min ({timeline.length - 1} Haltestellen)
        </p>
      )}

      {trips.length > 0 && (
        <label style={{ display: "block", marginBottom: "1rem" }}>
          Abfahrt anzeigen:{" "}
          <select
            value={tripId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v) setSearchParams({ trip: v });
              else setSearchParams({});
            }}
          >
            <option value="">— Streckenverlauf ohne Uhrzeit —</option>
            {trips.map((t) => (
              <option key={t.tripId} value={t.tripId}>
                {tripOptionLabel(t)}
              </option>
            ))}
          </select>
        </label>
      )}

      {timeline.length === 0 ? (
        <p className="muted">Für diese Linie sind keine Haltestellen hinterlegt.</p>
      ) : (
        <TripTimeline stops={timeline} color={route.color} />
      )}
    </section>
  );
}
