// 1:1 übernommen aus app/src/types/data.ts - gleiches JSON-Schema, das die Pipeline erzeugt
// und das die Web-App weiterhin direkt lädt. Eigene Kopie hier, da api/ ein eigenständiges
// npm-Projekt ist (kein npm-Workspace-Setup im Repo).
export interface RouteData {
  id: string;
  shortName: string;
  longName: string;
  color: string;
}

export interface StopData {
  id: string;
  name: string;
  /** Aus OpenStreetMap, fehlt bei ~7% der Haltestellen */
  lat?: number;
  lon?: number;
}

/** "schoolday" = nur an Schultagen (siehe holidays.ts isSchoolDay), kommt bei Linie 2 vor. */
export type ServiceId = "weekday" | "saturday" | "schoolday";

export interface DepartureData {
  tripId: string;
  routeId: string;
  service: ServiceId;
  /** HH:MM:SS, kann >24:00:00 sein bei Tagesüberlauf */
  time: string;
  stopSeq: number;
  headsign: string;
  /** true = laut Fahrplan an dieser Haltestelle nur Bedarf zum Aussteigen, kein Einstieg */
  dropOffOnly?: true;
}

export type DeparturesByStop = Record<string, DepartureData[]>;

/** service id -> aktive Wochentage, 0=So..6=Sa (JS Date#getDay()-Konvention) */
export type CalendarData = Record<string, number[]>;

export interface MetaData {
  generatedAt: string;
  source: string;
  disclaimer: string;
  attribution: string;
  lineCount: number;
}

export interface RouteStopEntry {
  stopId: string;
  name: string;
  note?: "an" | "ab";
}

export type RouteStops = Record<string, RouteStopEntry[]>;

export interface ScheduleBundle {
  routes: RouteData[];
  stops: StopData[];
  departures: DeparturesByStop;
  calendar: CalendarData;
  meta: MetaData;
  routeStops: RouteStops;
}

// Verschoben hierher aus dem inzwischen entfernten routePlanner.ts (jetzt durch einen
// Motis-Proxy ersetzt, siehe motisClient.ts/motisTranslate.ts) - dieser Antwort-Vertrag
// bleibt für Android/den Web-App-Fallback unverändert bestehen.
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
