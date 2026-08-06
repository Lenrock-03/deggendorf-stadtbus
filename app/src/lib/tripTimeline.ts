import type { ScheduleBundle, ServiceId } from "../types/data";
import { parseTimeToMinutes } from "./time";

export interface TripOption {
  tripId: string;
  service: ServiceId;
  /** HH:MM:SS am ersten Halt dieser Fahrt (zur Sortierung/Anzeige) */
  startTime: string;
}

export interface TimelineStop {
  stopId: string;
  name: string;
  /** Fehlt in der zeitlosen Übersicht (Einstieg über die Linienübersicht ohne gewählte Abfahrt) */
  time?: string;
  note?: "an" | "ab";
  isFirst: boolean;
  isLast: boolean;
}

/** Reiner Streckenverlauf ohne Uhrzeiten (Einstieg von der Linienübersicht). */
export function routeOutline(bundle: ScheduleBundle, routeId: string): TimelineStop[] {
  const seq = bundle.routeStops[routeId];
  if (!seq || seq.length === 0) return [];
  return seq.map((s, i) => ({
    stopId: s.stopId,
    name: s.name,
    note: s.note,
    isFirst: i === 0,
    isLast: i === seq.length - 1,
  }));
}

/**
 * Alle Fahrten einer Linie, ermittelt über die Abfahrten an deren erster Haltestelle
 * (jede Fahrt - auch Kurzfahrten - bedient laut Datenmodell immer ihre erste Haltestelle).
 */
export function tripsForRoute(bundle: ScheduleBundle, routeId: string): TripOption[] {
  const seq = bundle.routeStops[routeId];
  if (!seq || seq.length === 0) return [];
  const firstStopId = seq[0].stopId;
  const deps = bundle.departures[firstStopId] ?? [];
  return deps
    .filter((d) => d.routeId === routeId && d.stopSeq === 1)
    .map((d) => ({ tripId: d.tripId, service: d.service, startTime: d.time }))
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
}

/**
 * Vollständiger Haltestellenverlauf einer konkreten Fahrt mit Uhrzeiten. Bei Kurzfahrten
 * (die nicht die komplette Ringlinie bedienen) enthält das Ergebnis nur die tatsächlich
 * bedienten Haltestellen - endet also ggf. vor dem Ende der Linie.
 */
export function timelineForTrip(
  bundle: ScheduleBundle,
  routeId: string,
  tripId: string
): TimelineStop[] {
  const seq = bundle.routeStops[routeId];
  if (!seq) return [];

  const stops: TimelineStop[] = [];
  seq.forEach((s, i) => {
    const stopSeq = i + 1;
    const dep = (bundle.departures[s.stopId] ?? []).find(
      (d) => d.tripId === tripId && d.stopSeq === stopSeq
    );
    if (dep) {
      stops.push({ stopId: s.stopId, name: s.name, time: dep.time, note: s.note, isFirst: false, isLast: false });
    }
  });

  if (stops.length > 0) {
    stops[0].isFirst = true;
    stops[stops.length - 1].isLast = true;
  }
  return stops;
}

/** Fahrtdauer in Minuten zwischen erster und letzter Haltestelle der Timeline. */
export function timelineDurationMin(stops: TimelineStop[]): number {
  const first = stops[0]?.time;
  const last = stops[stops.length - 1]?.time;
  if (stops.length < 2 || !first || !last) return 0;
  return parseTimeToMinutes(last) - parseTimeToMinutes(first);
}

const SERVICE_LABELS: Record<ServiceId, string> = { weekday: "Mo-Fr", saturday: "Sa" };

export function tripOptionLabel(t: TripOption): string {
  return `${SERVICE_LABELS[t.service]} ${t.startTime.slice(0, 5)}`;
}
