import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AgencyInput,
  LineInput,
  RouteOut,
  StopOut,
  DepartureOut,
  CalendarOut,
  MetaOut,
  ServiceId,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const FALLBACK_DIR = join(__dirname, "..", "fallback-data");
const OUT_DIR = join(REPO_ROOT, "app", "public", "data");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m + minutes;
  // GTFS-Konvention: Tagesüberlauf wird NICHT auf 0 zurückgesetzt, sondern >24:00 dargestellt
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
}

function toHms(hhmm: string): string {
  return `${hhmm}:00`;
}

function loadAgency(): AgencyInput {
  return JSON.parse(readFileSync(join(FALLBACK_DIR, "agency.json"), "utf-8"));
}

function loadLines(): LineInput[] {
  const dir = join(FALLBACK_DIR, "lines");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf-8")) as LineInput)
    .sort((a, b) => a.id.localeCompare(b.id, "de", { numeric: true }));
}

function loadStopCoords(): Record<string, { lat: number; lon: number }> {
  try {
    return JSON.parse(readFileSync(join(FALLBACK_DIR, "stop-coords.json"), "utf-8"));
  } catch {
    return {};
  }
}

function main() {
  const agency = loadAgency();
  const lines = loadLines();
  const stopCoords = loadStopCoords();

  const routes: RouteOut[] = [];
  const stopIdByName = new Map<string, string>();
  const stops: StopOut[] = [];
  const departuresByStop = new Map<string, DepartureOut[]>();
  /** Vollständiger Haltestellenverlauf je Linie, in Fahrtrichtung (für die Liniendetail-Ansicht). */
  const routeStopSequence: Record<string, { stopId: string; name: string; note?: "an" | "ab" }[]> = {};
  const calendar: CalendarOut = {
    weekday: [1, 2, 3, 4, 5],
    saturday: [6],
    // Wochentags-Grundmuster wie "weekday" - die App filtert zusätzlich per
    // isSchoolDay(date) (Ferien/Feiertage raus), siehe lib/calendar.ts activeServicesForDate.
    schoolday: [1, 2, 3, 4, 5],
  };

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

  let validationErrors: string[] = [];

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
          validationErrors.push(
            `Linie ${line.id}, Fahrt ${trip.id}: Template-Modus ohne offsetsMin`
          );
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

      const dropOffOnly = "times" in trip ? trip.dropOffOnly : undefined;

      times.forEach((time, i) => {
        if (time === null) return;
        const stopId = stopIds[i];
        const dep: DepartureOut = {
          tripId: `${line.id}-${trip.id}`,
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

  if (validationErrors.length > 0) {
    console.error("Validierungsfehler:");
    for (const e of validationErrors) console.error(`  - ${e}`);
    process.exit(1);
  }

  // Abfahrten je Haltestelle chronologisch sortieren
  const departures: Record<string, DepartureOut[]> = {};
  for (const [stopId, list] of departuresByStop) {
    departures[stopId] = list.sort((a, b) => a.time.localeCompare(b.time));
  }

  const meta: MetaOut = {
    generatedAt: new Date().toISOString(),
    source: "manual-pdf",
    disclaimer:
      "Fahrplandaten manuell aus den offiziellen PDF-Fahrplänen der Artmeier Bus GmbH & Co. KG übertragen. Ohne Gewähr – im Zweifel gilt der offizielle Aushangfahrplan.",
    attribution: `Fahrplandaten: ${agency.name} (${agency.url}). Haltestellen-Standorte: © OpenStreetMap-Mitwirkende, ODbL (openstreetmap.org/copyright).`,
    lineCount: lines.length,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "routes.json"), JSON.stringify(routes, null, 2));
  writeFileSync(join(OUT_DIR, "stops.json"), JSON.stringify(stops, null, 2));
  writeFileSync(join(OUT_DIR, "departures.json"), JSON.stringify(departures, null, 2));
  writeFileSync(join(OUT_DIR, "calendar.json"), JSON.stringify(calendar, null, 2));
  writeFileSync(join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2));
  writeFileSync(join(OUT_DIR, "routeStops.json"), JSON.stringify(routeStopSequence, null, 2));

  console.log(`OK: ${routes.length} Linien, ${stops.length} Haltestellen, ${Object.keys(departures).length} Haltestellen mit Abfahrten -> ${OUT_DIR}`);
}

main();
