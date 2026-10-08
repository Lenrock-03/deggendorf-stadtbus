import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CalendarOut, DepartureOut, MetaOut } from "./types.js";
import { buildScheduleModel, loadAgency, loadLines, loadStopCoords } from "./scheduleModel.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const FALLBACK_DIR = join(__dirname, "..", "fallback-data");
const OUT_DIR = join(REPO_ROOT, "app", "public", "data");

function main() {
  const agency = loadAgency(FALLBACK_DIR);
  const lines = loadLines(FALLBACK_DIR);
  const stopCoords = loadStopCoords(FALLBACK_DIR);

  const { routes, stops, departuresByStop, routeStopSequence, validationErrors } = buildScheduleModel(
    lines,
    stopCoords
  );

  if (validationErrors.length > 0) {
    console.error("Validierungsfehler:");
    for (const e of validationErrors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const calendar: CalendarOut = {
    weekday: [1, 2, 3, 4, 5],
    saturday: [6],
    // Wochentags-Grundmuster wie "weekday" - die App filtert zusätzlich per
    // isSchoolDay(date) (Ferien/Feiertage raus), siehe lib/calendar.ts activeServicesForDate.
    schoolday: [1, 2, 3, 4, 5],
  };

  const departures: Record<string, DepartureOut[]> = {};
  for (const [stopId, list] of departuresByStop) {
    departures[stopId] = list;
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

  console.log(
    `OK: ${routes.length} Linien, ${stops.length} Haltestellen, ${Object.keys(departures).length} Haltestellen mit Abfahrten -> ${OUT_DIR}`
  );
}

main();
