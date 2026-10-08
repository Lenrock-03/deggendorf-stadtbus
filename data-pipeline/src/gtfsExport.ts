import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import JSZip from "jszip";
import type { ServiceId, StopOut } from "./types.js";
import { buildScheduleModel, loadLines, loadStopCoords, loadAgency } from "./scheduleModel.js";
import { buildCsv } from "./csv.js";
import { isPublicHoliday, isSchoolDay, SCHOOL_HOLIDAY_RANGES } from "./holidays.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FALLBACK_DIR = join(__dirname, "..", "fallback-data");
const OUT_DIR = join(__dirname, "..", "gtfs-out");

/** "black"/"white" -> Hex, fürs GTFS-Feld route_text_color (erwartet Hex ohne '#'),
 * dieselbe WCAG-Kontrastformel wie app/src/lib/color.ts readableTextColor(). */
export function readableTextColorHex(hex: string): string {
  const clean = hex.replace(/^#/, "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? "FFFFFF" : "000000";
}

function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

const WEEKDAY_PATTERN: Record<ServiceId, number[]> = {
  weekday: [1, 2, 3, 4, 5],
  saturday: [6],
  schoolday: [1, 2, 3, 4, 5],
};
const SERVICE_IDS: ServiceId[] = ["weekday", "saturday", "schoolday"];

export function weeklyActiveServices(date: Date): Set<ServiceId> {
  const wd = date.getDay();
  return new Set(SERVICE_IDS.filter((s) => WEEKDAY_PATTERN[s].includes(wd)));
}

/** Exakt dieselbe Regel wie app/src/lib/calendar.ts activeServicesForDate() - hier zur
 * Build-Zeit ausgewertet statt zur Laufzeit, um calendar_dates.txt-Ausnahmen zu erzeugen. */
export function actualActiveServices(date: Date): Set<ServiceId> {
  const wd = date.getDay();
  const isHeiligabendOderSilvester = date.getMonth() === 11 && (date.getDate() === 24 || date.getDate() === 31);
  if (isHeiligabendOderSilvester && wd !== 0) {
    return new Set<ServiceId>(["saturday"]);
  }
  if (isPublicHoliday(date)) return new Set();
  const services = weeklyActiveServices(date);
  if (!isSchoolDay(date)) services.delete("schoolday");
  return services;
}

/** Fehlende Koordinaten (~7% der Haltestellen, siehe StopOut) linear zwischen den
 * nächsten Nachbarn MIT bekannten Koordinaten im Linienverlauf interpolieren, statt den
 * Export hart abbrechen zu lassen - GTFS verlangt stop_lat/stop_lon auf jeder Zeile. */
export function fillMissingCoords(
  stops: StopOut[],
  routeStopSequence: Record<string, { stopId: string; name: string }[]>
): { stops: StopOut[]; interpolated: string[] } {
  const byId = new Map(stops.map((s) => [s.id, { ...s }]));
  const interpolated: string[] = [];

  for (const seq of Object.values(routeStopSequence)) {
    seq.forEach((entry, i) => {
      const stop = byId.get(entry.stopId);
      if (!stop || stop.lat != null) return;

      let before = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (byId.get(seq[j].stopId)?.lat != null) {
          before = j;
          break;
        }
      }
      let after = -1;
      for (let j = i + 1; j < seq.length; j++) {
        if (byId.get(seq[j].stopId)?.lat != null) {
          after = j;
          break;
        }
      }

      let lat: number | undefined;
      let lon: number | undefined;
      if (before >= 0 && after >= 0) {
        const a = byId.get(seq[before].stopId)!;
        const b = byId.get(seq[after].stopId)!;
        const w = (i - before) / (after - before);
        lat = a.lat! + w * (b.lat! - a.lat!);
        lon = a.lon! + w * (b.lon! - a.lon!);
      } else if (before >= 0) {
        const a = byId.get(seq[before].stopId)!;
        lat = a.lat;
        lon = a.lon;
      } else if (after >= 0) {
        const b = byId.get(seq[after].stopId)!;
        lat = b.lat;
        lon = b.lon;
      }

      if (lat != null && lon != null) {
        stop.lat = lat;
        stop.lon = lon;
        interpolated.push(`${entry.name} (${entry.stopId})`);
      }
    });
  }

  return { stops: [...byId.values()], interpolated };
}

async function main() {
  const agency = loadAgency(FALLBACK_DIR);
  const lines = loadLines(FALLBACK_DIR);
  const stopCoords = loadStopCoords(FALLBACK_DIR);

  const { routes, stops: rawStops, departuresByStop, trips, routeStopSequence, validationErrors } =
    buildScheduleModel(lines, stopCoords);

  if (validationErrors.length > 0) {
    console.error("Validierungsfehler:");
    for (const e of validationErrors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const { stops, interpolated } = fillMissingCoords(rawStops, routeStopSequence);
  if (interpolated.length > 0) {
    console.log(`Koordinaten interpoliert (${interpolated.length}):`);
    for (const s of interpolated) console.log(`  - ${s}`);
  }
  const stillMissing = stops.filter((s) => s.lat == null);
  if (stillMissing.length > 0) {
    console.error("Haltestellen ohne jede Koordinate (auch nach Interpolation):");
    for (const s of stillMissing) console.error(`  - ${s.name} (${s.id})`);
    process.exit(1);
  }

  // calendar.txt-Fenster: ab heute bis zum Ende des letzten bekannten Schuljahres in
  // SCHOOL_HOLIDAY_RANGES + Puffer - passt sich automatisch an, wenn die Tabelle um ein
  // weiteres Schuljahr ergänzt wird, statt ein zweites Datum von Hand zu pflegen.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxRangeEnd = SCHOOL_HOLIDAY_RANGES.reduce(
    (max, r) => (r.end > max ? r.end : max),
    SCHOOL_HOLIDAY_RANGES[0].end
  );
  const [ey, em, ed] = maxRangeEnd.split("-").map(Number);
  const endDate = addDays(new Date(ey, em - 1, ed), 14);

  // ---- agency.txt ----
  const agencyCsv = buildCsv(
    ["agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang", "agency_phone"],
    [[agency.id, agency.name, agency.url, agency.timezone, agency.lang, agency.phone]]
  );

  // ---- routes.txt ----
  const routesCsv = buildCsv(
    ["route_id", "agency_id", "route_short_name", "route_long_name", "route_type", "route_color", "route_text_color"],
    routes.map((r) => [r.id, agency.id, r.shortName, r.longName, 3, r.color, readableTextColorHex(r.color)])
  );

  // ---- stops.txt ----
  const stopsCsv = buildCsv(
    ["stop_id", "stop_name", "stop_lat", "stop_lon"],
    stops.map((s) => [s.id, s.name, s.lat, s.lon])
  );

  // ---- trips.txt ----
  const tripsCsv = buildCsv(
    ["route_id", "service_id", "trip_id", "trip_headsign"],
    trips.map((t) => [t.routeId, t.service, t.tripId, t.headsign])
  );

  // ---- stop_times.txt ----
  const stopTimeRows: (string | number)[][] = [];
  for (const [stopId, deps] of departuresByStop) {
    for (const d of deps) {
      stopTimeRows.push([d.tripId, d.time, d.time, stopId, d.stopSeq, d.dropOffOnly ? 1 : 0, 0]);
    }
  }
  const stopTimesCsv = buildCsv(
    ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "pickup_type", "drop_off_type"],
    stopTimeRows
  );

  // ---- calendar.txt ----
  const calendarCsv = buildCsv(
    [
      "service_id",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
      "start_date",
      "end_date",
    ],
    SERVICE_IDS.map((svc) => {
      const days = WEEKDAY_PATTERN[svc];
      const has = (wd: number) => (days.includes(wd) ? 1 : 0);
      return [
        svc,
        has(1),
        has(2),
        has(3),
        has(4),
        has(5),
        has(6),
        has(0),
        ymd(today),
        ymd(endDate),
      ];
    })
  );

  // ---- calendar_dates.txt ----
  const exceptionRows: (string | number)[][] = [];
  for (let d = new Date(today); d <= endDate; d = addDays(d, 1)) {
    const weekly = weeklyActiveServices(d);
    const actual = actualActiveServices(d);
    for (const svc of SERVICE_IDS) {
      const was = weekly.has(svc);
      const is = actual.has(svc);
      if (was && !is) exceptionRows.push([svc, ymd(d), 2]);
      if (!was && is) exceptionRows.push([svc, ymd(d), 1]);
    }
  }
  const calendarDatesCsv = buildCsv(["service_id", "date", "exception_type"], exceptionRows);

  mkdirSync(OUT_DIR, { recursive: true });
  const zip = new JSZip();
  zip.file("agency.txt", agencyCsv);
  zip.file("routes.txt", routesCsv);
  zip.file("stops.txt", stopsCsv);
  zip.file("trips.txt", tripsCsv);
  zip.file("stop_times.txt", stopTimesCsv);
  zip.file("calendar.txt", calendarCsv);
  zip.file("calendar_dates.txt", calendarDatesCsv);

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  writeFileSync(join(OUT_DIR, "gtfs.zip"), buf);

  console.log(
    `OK: GTFS mit ${routes.length} Linien, ${stops.length} Haltestellen, ${trips.length} Fahrten, ` +
      `${exceptionRows.length} Kalender-Ausnahmen (${ymd(today)}-${ymd(endDate)}) -> ${join(OUT_DIR, "gtfs.zip")}`
  );
}

// Nur ausführen, wenn direkt als Script gestartet (nicht beim Import der o.g. Hilfsfunktionen
// durch gtfsExport.test.ts) - sonst würde jeder Testlauf gleich den vollen Export schreiben.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
