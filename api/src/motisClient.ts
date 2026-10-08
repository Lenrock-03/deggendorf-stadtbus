// Schlanker Client für die selbst gehostete Motis-Routing-Engine (ersetzt die bisherige
// eigene findJourneys()-Heuristik, siehe routePlanner.ts-Löschung). Läuft intern im
// Docker-Compose-Netz unter dem Service-Namen "motis" (siehe docker-compose.yml), nicht
// öffentlich erreichbar - nur api/ spricht mit Motis.
const MOTIS_URL = process.env.MOTIS_URL ?? "http://localhost:8093";
const REQUEST_TIMEOUT_MS = 8_000;

export interface MotisPlace {
  name: string;
  stopId?: string;
  lat: number;
  lon: number;
}

export interface MotisLeg {
  mode: string;
  from: MotisPlace;
  to: MotisPlace;
  startTime: string; // RFC3339
  endTime: string; // RFC3339
  headsign?: string;
  routeId?: string;
  routeColor?: string;
  routeTextColor?: string;
  routeShortName?: string;
  routeLongName?: string;
  tripId?: string;
  /** Nur bei Nicht-Transit-Etappen (WALK etc.) gesetzt - Strecke in Metern. */
  distance?: number;
}

export interface MotisItinerary {
  duration: number;
  startTime: string;
  endTime: string;
  transfers: number;
  legs: MotisLeg[];
}

export interface MotisPlanResponse {
  itineraries: MotisItinerary[];
}

/** Europe/Berlin-UTC-Offset für ein Kalenderdatum, DST-fest - per Mittags-Sonde ermittelt
 * (weit weg von der 2/3-Uhr-Umstellungszeit, daher nie auf der falschen Seite der
 * Sommer-/Winterzeit-Grenze). */
export function berlinOffset(year: number, month: number, day: number): string {
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    timeZoneName: "shortOffset",
  }).formatToParts(probe);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const match = tzName.match(/GMT([+-]\d+)/);
  const hours = match ? Number(match[1]) : 1;
  const sign = hours >= 0 ? "+" : "-";
  return `${sign}${String(Math.abs(hours)).padStart(2, "0")}:00`;
}

/** `date` (Kalendertag, UTC-Mitternacht - siehe parseDateQuery in routes.ts) + `afterMin`
 * (Minuten seit Mitternacht) -> RFC3339-Zeitstempel in der Europe/Berlin-Ortszeit, die
 * Motis für den `time`-Parameter erwartet. */
export function toRfc3339Berlin(date: Date, afterMin: number): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const hh = Math.floor(afterMin / 60);
  const mm = afterMin % 60;
  const offset = berlinOffset(y, m, d);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00${offset}`;
}

export class MotisError extends Error {}

// Der Datensatz-Key aus config.yml (data-pipeline/gtfsExport.ts erzeugt "gtfs.zip", Motis
// leitet daraus beim `motis config`-Schritt den Key "gtfs" ab) - Motis hängt ihn als Präfix
// an jede Haltestellen-/Linien-/Trip-ID (z.B. Haltestelle "deggendorf-klinikum" ->
// "gtfs_deggendorf-klinikum"). Per Live-Test gegen eine echte Motis-Instanz bestätigt, nicht
// nur aus der Doku angenommen. motisTranslate.ts entfernt dasselbe Präfix wieder aus der
// Antwort - beide Seiten teilen sich diese Konstante, damit sie nicht auseinanderlaufen.
export const FEED_ID = "gtfs";

/** Fragt Motis nach Verbindungen von `fromStopId` nach `toStopId` ab `date`+`afterMin`.
 * `fromPlace`/`toPlace` akzeptieren Haltestellen-IDs direkt (siehe openapi.yaml), aber mit
 * dem Datensatz-Präfix (siehe FEED_ID) - unsere Haltestellen-IDs sind sonst 1:1 die GTFS
 * stop_id aus dem Export (data-pipeline/gtfsExport.ts), also kein Koordinaten-Lookup nötig. */
export async function planJourneys(
  fromStopId: string,
  toStopId: string,
  date: Date,
  afterMin: number,
  maxResults: number
): Promise<MotisPlanResponse> {
  const url = new URL("/api/v6/plan", MOTIS_URL);
  url.searchParams.set("fromPlace", `${FEED_ID}_${fromStopId}`);
  url.searchParams.set("toPlace", `${FEED_ID}_${toStopId}`);
  url.searchParams.set("time", toRfc3339Berlin(date, afterMin));
  url.searchParams.set("arriveBy", "false");
  url.searchParams.set("numItineraries", String(maxResults));
  url.searchParams.set("maxItineraries", String(maxResults));
  // Default searchWindow (900s/15min) ist für ein kleines 4-Linien-Netz mit teils
  // stündlichem Takt zu knapp bemessen - großzügiger gewählt, damit genug Ergebnisse über
  // einen längeren Zeitraum zusammenkommen. Ggf. nach echten Tests (Milestone 2 des Plans)
  // weiter anpassen.
  url.searchParams.set("searchWindow", "7200");

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    throw new MotisError(`Motis nicht erreichbar: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new MotisError(`Motis /api/v6/plan: HTTP ${res.status} - ${body.slice(0, 300)}`);
  }
  return (await res.json()) as MotisPlanResponse;
}
