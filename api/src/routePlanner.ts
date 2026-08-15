import type { DepartureData, ScheduleBundle } from "./types.js";
import { activeServicesForDate } from "./calendar.js";
import { parseTimeToMinutes } from "./time.js";

export interface JourneyLeg {
  routeId: string;
  routeShortName: string;
  routeColor: string;
  tripId: string;
  boardStopId: string;
  boardStopName: string;
  boardTime: string;
  alightStopId: string;
  alightStopName: string;
  alightTime: string;
  headsign: string;
}

export interface Journey {
  legs: JourneyLeg[];
  departureTime: string;
  arrivalTime: string;
  /** Wartezeit am Umstiegshalt in Minuten, nur bei 2 Etappen */
  transferWaitMin?: number;
}

const MIN_TRANSFER_MIN = 1;
/** Nur die nächsten N Abfahrten je Starthaltestelle betrachten (Performance + Relevanz -
 * niemand will Verbindungen, die erst in 8 Stunden losfahren). */
const MAX_ORIGIN_DEPARTURES = 20;
/** Je Umstiegshalt nur die nächsten N Anschlussfahrten prüfen. */
const MAX_TRANSFER_CANDIDATES = 4;

interface StopVisit {
  stopId: string;
  stopName: string;
  time: string;
  stopSeq: number;
}

/** Haltestellen, die von mindestens 2 verschiedenen Linien bedient werden - einzig
 * sinnvolle Umstiegspunkte (an einer nur von einer Linie bedienten Haltestelle böte ein
 * "Umstieg" auf eine andere Fahrt derselben Linie i.d.R. keinen Vorteil). */
function findInterchangeStops(bundle: ScheduleBundle): Set<string> {
  const routesByStop = new Map<string, Set<string>>();
  for (const [stopId, deps] of Object.entries(bundle.departures)) {
    const set = routesByStop.get(stopId) ?? new Set<string>();
    for (const d of deps) set.add(d.routeId);
    routesByStop.set(stopId, set);
  }
  const result = new Set<string>();
  for (const [stopId, routes] of routesByStop) {
    if (routes.size >= 2) result.add(stopId);
  }
  return result;
}

/** Alle folgenden Haltestellen einer Fahrt nach einer gegebenen Position im Linienverlauf. */
function stopsAfter(bundle: ScheduleBundle, routeId: string, tripId: string, afterStopSeq: number): StopVisit[] {
  const seq = bundle.routeStops[routeId];
  if (!seq) return [];
  const out: StopVisit[] = [];
  seq.forEach((s, i) => {
    const stopSeq = i + 1;
    if (stopSeq <= afterStopSeq) return;
    const dep = (bundle.departures[s.stopId] ?? []).find((d) => d.tripId === tripId && d.stopSeq === stopSeq);
    if (dep) out.push({ stopId: s.stopId, stopName: s.name, time: dep.time, stopSeq });
  });
  return out;
}

function departuresAtStop(
  bundle: ScheduleBundle,
  stopId: string,
  activeServices: Set<string>,
  afterMin: number
): DepartureData[] {
  return (bundle.departures[stopId] ?? [])
    .filter((d) => activeServices.has(d.service) && parseTimeToMinutes(d.time) >= afterMin)
    .slice()
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
}

function toLeg(bundle: ScheduleBundle, board: DepartureData, boardStopId: string, alight: StopVisit): JourneyLeg {
  const route = bundle.routes.find((r) => r.id === board.routeId);
  const boardStop = bundle.stops.find((s) => s.id === boardStopId);
  return {
    routeId: board.routeId,
    routeShortName: route?.shortName ?? board.routeId,
    routeColor: route?.color ?? "1d4ed8",
    tripId: board.tripId,
    boardStopId,
    boardStopName: boardStop?.name ?? boardStopId,
    boardTime: board.time,
    alightStopId: alight.stopId,
    alightStopName: alight.stopName,
    alightTime: alight.time,
    headsign: board.headsign,
  };
}

/**
 * Gruppierschlüssel für Duplikat-Erkennung: Fahrten, die mit denselben Fahrzeugen
 * (tripIds) zur selben Ab-/Ankunftszeit fahren, aber an einem anderen von mehreren
 * möglichen gemeinsamen Halten umsteigen, sind für den Fahrgast keine echten
 * Alternativen - nur die erste gefundene wird behalten.
 */
function journeyKey(j: Journey): string {
  return `${j.departureTime}|${j.arrivalTime}|${j.legs.map((l) => l.tripId).join(">")}`;
}

/**
 * Sucht Verbindungen von originId nach destId ab einem Zeitpunkt an einem Tag: direkte
 * Fahrten sowie Verbindungen mit einmal Umsteigen an einer echten Umstiegshaltestelle
 * (von mindestens 2 Linien bedient). Kein voller Multi-Umstieg-Routenplaner - für ein
 * 4-Linien-Netz mit gemeinsamer Stammstrecke deckt das die relevanten Fälle ab.
 */
export function findJourneys(
  bundle: ScheduleBundle,
  originId: string,
  destId: string,
  date: Date,
  afterMin: number,
  maxResults = 8
): Journey[] {
  if (originId === destId) return [];

  const activeServices = new Set(activeServicesForDate(bundle.calendar, date));
  if (activeServices.size === 0) return [];

  const interchangeStops = findInterchangeStops(bundle);
  const originDeps = departuresAtStop(bundle, originId, activeServices, afterMin).slice(0, MAX_ORIGIN_DEPARTURES);

  const journeys: Journey[] = [];

  for (const dep of originDeps) {
    const rest = stopsAfter(bundle, dep.routeId, dep.tripId, dep.stopSeq);

    const direct = rest.find((s) => s.stopId === destId);
    if (direct) {
      journeys.push({
        legs: [toLeg(bundle, dep, originId, direct)],
        departureTime: dep.time,
        arrivalTime: direct.time,
      });
      continue; // einfache Direktverbindung gefunden, nicht zusätzlich nach Umstieg suchen
    }

    for (const stop of rest) {
      if (!interchangeStops.has(stop.stopId)) continue;
      const transferDeps = departuresAtStop(
        bundle,
        stop.stopId,
        activeServices,
        parseTimeToMinutes(stop.time) + MIN_TRANSFER_MIN
      )
        .filter((d2) => d2.routeId !== dep.routeId || d2.tripId !== dep.tripId)
        .slice(0, MAX_TRANSFER_CANDIDATES);

      for (const dep2 of transferDeps) {
        const rest2 = stopsAfter(bundle, dep2.routeId, dep2.tripId, dep2.stopSeq);
        const arrival2 = rest2.find((s) => s.stopId === destId);
        if (arrival2) {
          journeys.push({
            legs: [toLeg(bundle, dep, originId, stop), toLeg(bundle, dep2, stop.stopId, arrival2)],
            departureTime: dep.time,
            arrivalTime: arrival2.time,
            transferWaitMin: parseTimeToMinutes(dep2.time) - parseTimeToMinutes(stop.time),
          });
          break; // frühestmöglicher Anschluss an diesem Umstiegshalt reicht
        }
      }
    }
  }

  const seen = new Set<string>();
  return journeys
    .filter((j) => {
      const key = journeyKey(j);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const arr = parseTimeToMinutes(a.arrivalTime) - parseTimeToMinutes(b.arrivalTime);
      if (arr !== 0) return arr;
      // Bei gleicher Ankunftszeit die später abfahrende (= kürzere/weniger Wartezeit)
      // Verbindung bevorzugen - strikt besser, nicht nur eine "andere" Option.
      return parseTimeToMinutes(b.departureTime) - parseTimeToMinutes(a.departureTime);
    })
    .slice(0, maxResults);
}
