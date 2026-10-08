import type { Journey, JourneyLeg } from "./types.js";
import { FEED_ID, type MotisItinerary, type MotisLeg, type MotisPlanResponse } from "./motisClient.js";

/** RFC3339-Zeitstempel (beliebiger Offset) -> HH:MM:SS in Europe/Berlin-Ortszeit, das
 * bestehende Format von Journey/JourneyLeg. Normalisiert unabhängig davon, in welchem
 * Offset Motis selbst antwortet (per Live-Test bestätigt: Motis antwortet in UTC,
 * unabhängig vom Offset der Anfrage). */
function toLocalHms(rfc3339: string): string {
  const d = new Date(rfc3339);
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}:${get("second")}`;
}

// Motis hängt FEED_ID (siehe motisClient.ts) als Präfix an jede Haltestellen-/Linien-ID -
// ohne dieses Entfernen würden boardStopId/alightStopId/routeId nicht mehr zu unseren
// eigenen IDs passen (z.B. bundle.routeStops[routeId]-Lookups in getRouteTimeline würden
// sonst leer laufen).
const FEED_PREFIX = `${FEED_ID}_`;

function stripFeedPrefix(id: string | undefined): string {
  if (!id) return "";
  return id.startsWith(FEED_PREFIX) ? id.slice(FEED_PREFIX.length) : id;
}

// Motis' Trip-IDs sind Datum+Uhrzeit-qualifiziert (derselbe GTFS-Trip kann an mehreren
// Tagen laufen), Format laut Live-Test: "YYYYMMDD_HH:MM_<FEED_ID>_<unsere-trip-id>". Wir
// brauchen nur unseren ursprünglichen Teil zurück (z.B. für api/src/tripTimeline.ts-Lookups,
// die nach unserem eigenen tripId-Format suchen).
const TRIP_ID_PATTERN = new RegExp(`^\\d{8}_\\d{2}:\\d{2}_${FEED_ID}_(.+)$`);

function originalTripId(tripId: string | undefined): string {
  if (!tripId) return "";
  const m = tripId.match(TRIP_ID_PATTERN);
  return m ? m[1] : stripFeedPrefix(tripId);
}

/** Nur Transit-Etappen (Bus) - Fußwege (mode "WALK") haben kein routeId/tripId. */
function isTransitLeg(leg: MotisLeg): boolean {
  return leg.routeId != null && leg.tripId != null;
}

function toLeg(leg: MotisLeg): JourneyLeg {
  return {
    routeId: stripFeedPrefix(leg.routeId),
    routeShortName: leg.routeShortName ?? stripFeedPrefix(leg.routeId),
    routeColor: leg.routeColor ?? "1d4ed8",
    tripId: originalTripId(leg.tripId),
    boardStopId: stripFeedPrefix(leg.from.stopId),
    boardStopName: leg.from.name,
    boardTime: toLocalHms(leg.startTime),
    alightStopId: stripFeedPrefix(leg.to.stopId),
    alightStopName: leg.to.name,
    alightTime: toLocalHms(leg.endTime),
    headsign: leg.headsign ?? "",
  };
}

// Motis darf Start/Ziel auf eine praktisch gleiche Nachbarhaltestelle verschieben, wenn die
// per Fußweg verbunden sind (z.B. "Oberer Stadtplatz West"/"Ost" - zwei Bahnsteige desselben
// Platzes, 0m Luftlinie, siehe config.yml link_stop_distance: 100) - das ist erwünscht, der
// Fußweg ist in der Praxis nicht wahrnehmbar. Ein ECHTER Fußweg (z.B. 13min/~1km von
// "Waldschmidtweg" weiter zum eigentlich gesuchten "Klinikum", per Live-Test beobachtet)
// würde dagegen unser Journey/JourneyLeg-Format (kennt keine Fußwege, nur Bus-Etappen)
// fälschlich "angekommen" an der Zwischenhaltestelle zeigen lassen, ohne dass der Nutzer
// merkt, dass er noch weiterlaufen muss. Toleranzgrenze bewusst identisch zu Motis' eigenem
// link_stop_distance, statt einen zweiten, abweichenden Schwellwert zu erfinden.
const MAX_EDGE_WALK_METERS = 100;

function edgeWalkDistance(legs: MotisLeg[]): number {
  return legs.reduce((sum, l) => sum + (l.distance ?? Infinity), 0);
}

/**
 * Nicht modellierte (längere) Rand-Fußwege werden hier verworfen (siehe MAX_EDGE_WALK_METERS)
 * - ehrliche, etwas kleinere Ergebnismenge statt irreführender Anzeige. Eine saubere
 * Fußweg-Modellierung ist für später vorgesehen (Teil B des Plans, Oberflächen-Überarbeitung).
 */
function toJourney(itinerary: MotisItinerary): Journey | null {
  const firstTransitIdx = itinerary.legs.findIndex(isTransitLeg);
  if (firstTransitIdx === -1) return null;
  let lastTransitIdx = -1;
  itinerary.legs.forEach((l, i) => {
    if (isTransitLeg(l)) lastTransitIdx = i;
  });

  const leadingWalk = itinerary.legs.slice(0, firstTransitIdx);
  const trailingWalk = itinerary.legs.slice(lastTransitIdx + 1);
  if (edgeWalkDistance(leadingWalk) > MAX_EDGE_WALK_METERS) return null;
  if (edgeWalkDistance(trailingWalk) > MAX_EDGE_WALK_METERS) return null;

  const transitLegs = itinerary.legs.filter(isTransitLeg);
  const legs = transitLegs.map(toLeg);
  const journey: Journey = {
    legs,
    departureTime: toLocalHms(transitLegs[0].startTime),
    arrivalTime: toLocalHms(transitLegs[transitLegs.length - 1].endTime),
  };

  if (transitLegs.length === 2) {
    const waitMs = new Date(transitLegs[1].startTime).getTime() - new Date(transitLegs[0].endTime).getTime();
    journey.transferWaitMin = Math.round(waitMs / 60_000);
  }

  return journey;
}

/** Motis-Itinerare -> das bestehende Journey[]-Antwortformat von GET /api/journeys, damit
 * sich für Android/den Web-App-Fallback nichts ändert (siehe api/src/routes.ts getJourneys). */
export function toJourneys(plan: MotisPlanResponse, maxResults: number): Journey[] {
  return plan.itineraries
    .map((it) => toJourney(it))
    .filter((j): j is Journey => j !== null)
    .slice(0, maxResults);
}
