import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSchedule } from "../lib/useSchedule";
import LineBadge from "../components/LineBadge";
import TripTimeline from "../components/TripTimeline";
import { ErrorBanner, LoadingBanner } from "../components/StatusBanner";
import { timelineDurationMin, timelineForTrip, tripOptionLabel, tripsForRoute } from "../lib/tripTimeline";
import { nowMinutesInBerlin, parseTimeToMinutes, weekdayInBerlin } from "../lib/time";
import { activeServicesForWeekday } from "../lib/calendar";

export default function LineDetail() {
  const { id } = useParams<{ id: string }>();
  const schedule = useSchedule();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const trips = useMemo(() => (schedule.status === "ready" && id ? tripsForRoute(schedule.data, id) : []), [schedule, id]);

  // Standardauswahl: nächste heute noch aktive Fahrt, sonst die erste Fahrt des Tages.
  const defaultTripId = useMemo(() => {
    if (schedule.status !== "ready" || trips.length === 0) return null;
    const active = new Set(activeServicesForWeekday(schedule.data.calendar, weekdayInBerlin()));
    const nowMin = nowMinutesInBerlin();
    const todaysUpcoming = trips
      .filter((t) => active.has(t.service) && parseTimeToMinutes(t.startTime) >= nowMin)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
    return (todaysUpcoming[0] ?? trips[0]).tripId;
  }, [schedule, trips]);

  const tripId = selectedTripId ?? defaultTripId;

  if (schedule.status === "loading") return <LoadingBanner />;
  if (schedule.status === "error") return <ErrorBanner message={schedule.error} />;

  const { routes } = schedule.data;
  const route = routes.find((r) => r.id === id);

  if (!route || !id) {
    return <ErrorBanner message={`Linie ${id} wurde nicht gefunden.`} />;
  }

  const timeline = tripId ? timelineForTrip(schedule.data, id, tripId) : [];
  const duration = timelineDurationMin(timeline);
  const destination = timeline[timeline.length - 1]?.name;

  return (
    <section>
      <p>
        <Link to="/">&larr; Alle Linien</Link>
      </p>

      <div className="trip-header">
        <LineBadge route={route} />
        <span>▶</span>
        <strong>{destination ?? route.longName}</strong>
      </div>
      {timeline.length > 0 && (
        <p className="trip-header-sub">
          {duration} Min ({timeline.length - 1} Haltestellen)
        </p>
      )}

      {trips.length > 1 && (
        <label style={{ display: "block", marginBottom: "1rem" }}>
          Abfahrt:{" "}
          <select value={tripId ?? ""} onChange={(e) => setSelectedTripId(e.target.value)}>
            {trips.map((t) => (
              <option key={t.tripId} value={t.tripId}>
                {tripOptionLabel(t)}
              </option>
            ))}
          </select>
        </label>
      )}

      {timeline.length === 0 ? (
        <p className="muted">Für diese Linie sind keine Fahrten hinterlegt.</p>
      ) : (
        <TripTimeline stops={timeline} color={route.color} />
      )}
    </section>
  );
}
