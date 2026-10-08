import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { AgencyInput, LineInput, RouteOut, StopOut, DepartureOut, ServiceId } from "./types.js";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m + minutes;
  // GTFS-Konvention: Tagesüberlauf wird NICHT auf 0 zurückgesetzt, sondern >24:00 dargestellt
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
}

export function toHms(hhmm: string): string {
  return `${hhmm}:00`;
}

export function loadAgency(fallbackDir: string): AgencyInput {
  return JSON.parse(readFileSync(join(fallbackDir, "agency.json"), "utf-8"));
}

export function loadLines(fallbackDir: string): LineInput[] {
  const dir = join(fallbackDir, "lines");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf-8")) as LineInput)
    .sort((a, b) => a.id.localeCompare(b.id, "de", { numeric: true }));
}

export function loadStopCoords(fallbackDir: string): Record<string, { lat: number; lon: number }> {
  try {
    return JSON.parse(readFileSync(join(fallbackDir, "stop-coords.json"), "utf-8"));
  } catch {
    return {};
  }
}

export interface TripOut {
  tripId: string;
  routeId: string;
  service: ServiceId;
  headsign: string;
}

export interface ScheduleModel {
  routes: RouteOut[];
  stops: StopOut[];
  /** Abfahrten je Haltestelle, chronologisch sortiert - deckt departures.json UND
   * stop_times.txt ab (dieselben Felder). */
  departuresByStop: Map<string, DepartureOut[]>;
  /** Eine Zeile je Fahrt (nicht je Haltestellen-Besuch) - für trips.txt. */
  trips: TripOut[];
  routeStopSequence: Record<string, { stopId: string; name: string; note?: "an" | "ab" }[]>;
  validationErrors: string[];
}

/**
 * Baut das vollständige Fahrplan-Modell aus den Linien-Eingabedaten - gemeinsam von
 * buildBundle.ts (eigenes JSON-Bundle für app/) UND gtfsExport.ts (Standard-GTFS für
 * Motis) genutzt, damit Haltestellen-/Fahrt-IDs zwischen beiden Ausgaben exakt
 * übereinstimmen (keine separate Mapping-Tabelle nötig).
 */
export function buildScheduleModel(lines: LineInput[], stopCoords: Record<string, { lat: number; lon: number }>): ScheduleModel {
  const routes: RouteOut[] = [];
  const stopIdByName = new Map<string, string>();
  const stops: StopOut[] = [];
  const departuresByStop = new Map<string, DepartureOut[]>();
  const trips: TripOut[] = [];
  const routeStopSequence: ScheduleModel["routeStopSequence"] = {};
  const validationErrors: string[] = [];

  function stopIdFor(name: string): string {
    let id = stopIdByName.get(name);
    if (!id) {
      id = slugify(name);
      stopIdByName.set(name, id);
      const coords = stopCoords[name];
      stops.push({ id, name, ...(coords ? { lat: coords.lat, lon: coords.lon } : {}) });
    }
    return id;
  }

  for (const line of lines) {
    routes.push({
      id: line.id,
      shortName: line.shortName,
      longName: line.longName,
      color: line.color ?? "1d4ed8",
    });

    if (line.stops.length === 0) {
      validationErrors.push(`Linie ${line.id}: keine Haltestellen definiert`);
      continue;
    }

    const stopIds = line.stops.map((s) => stopIdFor(s.name));
    routeStopSequence[line.id] = line.stops.map((s, i) => ({
      stopId: stopIds[i],
      name: s.name,
      note: s.note,
    }));

    for (const trip of line.trips) {
      let times: (string | null)[];

      if ("times" in trip) {
        if (trip.times.length !== line.stops.length) {
          validationErrors.push(
            `Linie ${line.id}, Fahrt ${trip.id}: ${trip.times.length} Zeiten, erwartet ${line.stops.length}`
          );
          continue;
        }
        times = trip.times.map((t) => (t === null ? null : toHms(t)));
      } else {
        if (!line.offsetsMin) {
          validationErrors.push(`Linie ${line.id}, Fahrt ${trip.id}: Template-Modus ohne offsetsMin`);
          continue;
        }
        if (line.offsetsMin.length !== line.stops.length) {
          validationErrors.push(
            `Linie ${line.id}: offsetsMin-Länge (${line.offsetsMin.length}) != stops-Länge (${line.stops.length})`
          );
          continue;
        }
        times = line.offsetsMin.map((off) => addMinutes(trip.start, off));
      }

      // Fahrtziel dieser konkreten Fahrt = letzte Haltestelle, die sie tatsächlich bedient
      // (bei Kurzfahrten/"short workings" endet das ggf. vor dem Ende der Ringlinie).
      let lastServedIdx = -1;
      times.forEach((t, i) => {
        if (t !== null) lastServedIdx = i;
      });
      if (lastServedIdx === -1) {
        validationErrors.push(`Linie ${line.id}, Fahrt ${trip.id}: keine einzige Zeit vorhanden`);
        continue;
      }
      const headsign = line.stops[lastServedIdx].name;
      const tripId = `${line.id}-${trip.id}`;
      trips.push({ tripId, routeId: line.id, service: trip.service as ServiceId, headsign });

      const dropOffOnly = "times" in trip ? trip.dropOffOnly : undefined;

      times.forEach((time, i) => {
        if (time === null) return;
        const stopId = stopIds[i];
        const dep: DepartureOut = {
          tripId,
          routeId: line.id,
          service: trip.service as ServiceId,
          time,
          stopSeq: i + 1,
          headsign,
          ...(dropOffOnly?.[i] ? { dropOffOnly: true as const } : {}),
        };
        const list = departuresByStop.get(stopId) ?? [];
        list.push(dep);
        departuresByStop.set(stopId, list);
      });
    }
  }

  for (const [stopId, list] of departuresByStop) {
    departuresByStop.set(
      stopId,
      list.slice().sort((a, b) => a.time.localeCompare(b.time))
    );
  }

  return { routes, stops, departuresByStop, trips, routeStopSequence, validationErrors };
}
