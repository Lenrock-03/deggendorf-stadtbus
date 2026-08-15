// Handler-Funktionen für die Fahrplan-/Routenplaner-Endpunkte. Reine Wrapper um die
// portierten Module (calendar.ts, tripTimeline.ts, geo.ts, stopAliases.ts, routePlanner.ts)
// - die eigentliche Logik liegt dort, hier nur Query-Parameter-Validierung + Aufruf.
import type { ScheduleBundle } from "./types.js";
import { departuresForDate, nextDepartures } from "./calendar.js";
import { routeOutline, timelineForTrip, tripsForRoute } from "./tripTimeline.js";
import { nearestStops } from "./geo.js";
import { stopMatchesQuery } from "./stopAliases.js";
import { findJourneys } from "./routePlanner.js";
import { parseTimeToMinutes } from "./time.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function requireQuery(url: URL, name: string): string {
  const v = url.searchParams.get(name);
  if (!v) throw new ApiError(400, `Parameter '${name}' fehlt`);
  return v;
}

function parseDateQuery(url: URL, name: string): Date {
  const raw = requireQuery(url, name);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `Parameter '${name}' ist kein gültiges Datum`);
  return d;
}

export function getRoutes(bundle: ScheduleBundle) {
  return bundle.routes;
}

export function getRouteOutline(bundle: ScheduleBundle, routeId: string) {
  return routeOutline(bundle, routeId);
}

export function getRouteTrips(bundle: ScheduleBundle, routeId: string) {
  return tripsForRoute(bundle, routeId);
}

export function getRouteTimeline(bundle: ScheduleBundle, routeId: string, url: URL) {
  const tripId = requireQuery(url, "tripId");
  return timelineForTrip(bundle, routeId, tripId);
}

export function getStops(bundle: ScheduleBundle) {
  return bundle.stops;
}

export function getStopsSearch(bundle: ScheduleBundle, url: URL) {
  const q = url.searchParams.get("q") ?? "";
  return bundle.stops.filter((s) => stopMatchesQuery(s.name, q));
}

export function getStopsNearest(bundle: ScheduleBundle, url: URL) {
  const lat = Number(requireQuery(url, "lat"));
  const lon = Number(requireQuery(url, "lon"));
  if (Number.isNaN(lat) || Number.isNaN(lon)) throw new ApiError(400, "lat/lon müssen Zahlen sein");
  const count = Number(url.searchParams.get("count") ?? "15");
  return nearestStops(bundle.stops, lat, lon, count);
}

export function getStopDepartures(bundle: ScheduleBundle, stopId: string, url: URL) {
  const stopDepartures = bundle.departures[stopId];
  if (!stopDepartures) throw new ApiError(404, `Haltestelle '${stopId}' nicht gefunden`);
  const mode = url.searchParams.get("mode") ?? "next";
  const count = Number(url.searchParams.get("count") ?? "8");
  if (mode === "date") {
    return departuresForDate(stopDepartures, bundle.calendar, parseDateQuery(url, "date"));
  }
  return nextDepartures(stopDepartures, bundle.calendar, new Date(), count);
}

export function getJourneys(bundle: ScheduleBundle, url: URL) {
  const from = requireQuery(url, "from");
  const to = requireQuery(url, "to");
  const date = url.searchParams.has("date") ? parseDateQuery(url, "date") : new Date();
  const afterMin = url.searchParams.has("afterMin")
    ? Number(url.searchParams.get("afterMin"))
    : parseTimeToMinutes(
        `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`
      );
  const maxResults = Number(url.searchParams.get("maxResults") ?? "8");
  if (!bundle.stops.some((s) => s.id === from)) throw new ApiError(404, `Haltestelle '${from}' nicht gefunden`);
  if (!bundle.stops.some((s) => s.id === to)) throw new ApiError(404, `Haltestelle '${to}' nicht gefunden`);
  return findJourneys(bundle, from, to, date, afterMin, maxResults);
}

export function getMeta(bundle: ScheduleBundle) {
  return bundle.meta;
}
