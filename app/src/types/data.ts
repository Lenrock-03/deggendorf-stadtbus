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

/** "schoolday" = nur an Schultagen (siehe lib/holidays.ts isSchoolDay), kommt bei Linie 2 vor. */
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
