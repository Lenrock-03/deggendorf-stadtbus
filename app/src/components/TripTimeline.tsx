import { Link } from "react-router-dom";
import type { TimelineStop } from "../lib/tripTimeline";

export default function TripTimeline({ stops, color }: { stops: TimelineStop[]; color: string }) {
  return (
    <ol className="trip-timeline" style={{ ["--line-color" as string]: `#${color}` }}>
      {stops.map((s) => (
        <li key={s.stopId} className={s.isFirst || s.isLast ? "endpoint" : undefined}>
          <Link to={`/haltestelle/${s.stopId}`} className="tt-row">
            <span className="tt-time">{s.time.slice(0, 5)}</span>
            <span className="tt-rail">
              <span className="tt-dot" />
            </span>
            <span className="tt-name">
              {s.name}
              {s.note && <span className="muted"> ({s.note})</span>}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
