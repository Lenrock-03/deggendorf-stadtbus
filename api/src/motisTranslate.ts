import type { Journey, JourneyLeg } from "./types.js";
import type { MotisItinerary, MotisLeg, MotisPlanResponse } from "./motisClient.js";

/** RFC3339-Zeitstempel (beliebiger Offset) -> HH:MM:SS in Europe/Berlin-Ortszeit, das
 * bestehende Format von Journey/JourneyLeg. Normalisiert unabhängig davon, in welchem
 * Offset Motis selbst antwortet. */
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

/** Nur Transit-Etappen (Bus) - Fußwege zwischen Haltestellen (mode "WALK") haben kein
 * routeId und werden rausgefiltert. In diesem Netz sollte es bei stopId->stopId-Anfragen
 * (statt Koordinaten) ohnehin keine nennenswerten Fußwege-Zwischenschritte geben, aber
 * robust gegen den Fall gebaut. */
function isTransitLeg(leg: MotisLeg): boolean {
  return leg.routeId != null && leg.tripId != null;
}

function toLeg(leg: MotisLeg): JourneyLeg {
  return {
    routeId: leg.routeId ?? "",
    routeShortName: leg.routeShortName ?? leg.routeId ?? "",
    routeColor: leg.routeColor ?? "1d4ed8",
    tripId: leg.tripId ?? "",
    boardStopId: leg.from.stopId ?? "",
    boardStopName: leg.from.name,
    boardTime: toLocalHms(leg.startTime),
    alightStopId: leg.to.stopId ?? "",
    alightStopName: leg.to.name,
    alightTime: toLocalHms(leg.endTime),
    headsign: leg.headsign ?? "",
  };
}

function toJourney(itinerary: MotisItinerary): Journey | null {
  const transitLegs = itinerary.legs.filter(isTransitLeg);
  if (transitLegs.length === 0) return null;

  const legs = transitLegs.map(toLeg);
  const first = transitLegs[0];
  const last = transitLegs[transitLegs.length - 1];

  const journey: Journey = {
    legs,
    departureTime: toLocalHms(first.startTime),
    arrivalTime: toLocalHms(last.endTime),
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
    .map(toJourney)
    .filter((j): j is Journey => j !== null)
    .slice(0, maxResults);
}
