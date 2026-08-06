import { useState } from "react";
import { Link } from "react-router-dom";
import type { Journey } from "../lib/routePlanner";
import { parseTimeToMinutes } from "../lib/time";
import { timelineSegment } from "../lib/tripTimeline";
import type { ScheduleBundle } from "../types/data";
import TripTimeline from "./TripTimeline";
import { readableTextColor } from "../lib/color";

type Segment =
  | { type: "leg"; boardTime: string; alightTime: string; routeShortName: string; routeColor: string; widthPct: number }
  | { type: "wait"; minutes: number; widthPct: number };

function buildSegments(journey: Journey): Segment[] {
  const totalMin = Math.max(1, parseTimeToMinutes(journey.arrivalTime) - parseTimeToMinutes(journey.departureTime));
  const segments: Segment[] = [];

  journey.legs.forEach((leg, i) => {
    const legMin = Math.max(1, parseTimeToMinutes(leg.alightTime) - parseTimeToMinutes(leg.boardTime));
    segments.push({
      type: "leg",
      boardTime: leg.boardTime,
      alightTime: leg.alightTime,
      routeShortName: leg.routeShortName,
      routeColor: leg.routeColor,
      widthPct: (legMin / totalMin) * 100,
    });
    const next = journey.legs[i + 1];
    if (next) {
      const waitMin = Math.max(0, parseTimeToMinutes(next.boardTime) - parseTimeToMinutes(leg.alightTime));
      if (waitMin > 0) segments.push({ type: "wait", minutes: waitMin, widthPct: (waitMin / totalMin) * 100 });
    }
  });

  return segments;
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export default function JourneyCard({ journey, bundle }: { journey: Journey; bundle: ScheduleBundle }) {
  const [open, setOpen] = useState(false);
  const segments = buildSegments(journey);
  const durationMin = parseTimeToMinutes(journey.arrivalTime) - parseTimeToMinutes(journey.departureTime);
  const first = journey.legs[0];
  const last = journey.legs[journey.legs.length - 1];

  return (
    <li className="card journey-card">
      <div className="journey-header">
        <strong className="journey-time-range">
          {journey.departureTime.slice(0, 5)} – {journey.arrivalTime.slice(0, 5)}
        </strong>
        <span className="muted">
          {formatDuration(durationMin)}
          {journey.legs.length > 1 && ` · ${journey.legs.length - 1}× umsteigen`}
          {journey.legs.length === 1 && " · direkt"}
        </span>
      </div>

      <div className="journey-bar">
        {segments.map((seg, i) =>
          seg.type === "leg" ? (
            <div
              key={i}
              className="journey-bar-leg"
              style={{
                flex: `${seg.widthPct} 0 0`,
                backgroundColor: `#${seg.routeColor}`,
                color: readableTextColor(seg.routeColor),
              }}
              title={`${seg.boardTime.slice(0, 5)}–${seg.alightTime.slice(0, 5)}`}
            >
              {seg.routeShortName}
            </div>
          ) : (
            <div key={i} className="journey-bar-wait" style={{ flex: `${seg.widthPct} 0 0` }} title={`${seg.minutes} Min. Umstiegszeit`} />
          )
        )}
      </div>

      <div className="journey-stops">
        <Link to={`/haltestelle/${first.boardStopId}`}>{first.boardStopName}</Link>
        <Link to={`/haltestelle/${last.alightStopId}`}>{last.alightStopName}</Link>
      </div>

      <button type="button" className="journey-details-toggle" onClick={() => setOpen((o) => !o)}>
        Details {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="journey-details">
          {journey.legs.map((leg, i) => (
            <div key={i}>
              <div className="journey-details-leg-header">
                <span
                  className="line-badge"
                  style={{ backgroundColor: `#${leg.routeColor}`, color: readableTextColor(leg.routeColor) }}
                >
                  {leg.routeShortName}
                </span>
                <span>nach {leg.headsign}</span>
              </div>
              <TripTimeline
                stops={timelineSegment(bundle, leg.routeId, leg.tripId, leg.boardStopId, leg.boardTime, leg.alightStopId, leg.alightTime)}
                color={leg.routeColor}
              />
              {i < journey.legs.length - 1 && (
                <p className="muted journey-transfer-note">
                  Umstieg in {leg.alightStopName}: Ankunft {leg.alightTime.slice(0, 5)} → Abfahrt{" "}
                  {journey.legs[i + 1].boardTime.slice(0, 5)} ({journey.transferWaitMin} Min.)
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
