import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CalendarData,
  DeparturesByStop,
  MetaData,
  RouteData,
  RouteStops,
  ScheduleBundle,
  StopData,
} from "./types.js";

// Im Docker-Image liegen die von data-pipeline gebauten JSON-Dateien unter /src/data (siehe
// Dockerfile-Builder-Stage). Für lokales `npm start` außerhalb von Docker zeigt der Default
// stattdessen auf den bereits vorhandenen app/public/data-Ordner, damit man nicht erst die
// Pipeline separat für api/ ausführen muss.
const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), "..", "app", "public", "data");

function readJson<T>(file: string): T {
  const raw = readFileSync(join(DATA_DIR, file), "utf-8");
  return JSON.parse(raw) as T;
}

let cached: ScheduleBundle | null = null;

/** Lädt das Fahrplan-Bundle einmalig synchron beim Serverstart (kleine Datenmenge, kein
 * Grund für async/Caching-Overhead - analog zu useSchedule.ts's Verhalten, nur serverseitig
 * und ohne Netzwerk-Roundtrip). Ein Neustart des Prozesses ist nötig, um neue Pipeline-Daten
 * zu übernehmen (passt zum bestehenden wöchentlichen Rebuild+Redeploy-Rhythmus). */
export function loadScheduleBundle(): ScheduleBundle {
  if (cached) return cached;
  cached = {
    routes: readJson<RouteData[]>("routes.json"),
    stops: readJson<StopData[]>("stops.json"),
    departures: readJson<DeparturesByStop>("departures.json"),
    calendar: readJson<CalendarData>("calendar.json"),
    meta: readJson<MetaData>("meta.json"),
    routeStops: readJson<RouteStops>("routeStops.json"),
  };
  return cached;
}
