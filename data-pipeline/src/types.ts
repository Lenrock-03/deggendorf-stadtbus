// Gemeinsame Typen für Pipeline-Eingabe (fallback-data/lines/*.json) und -Ausgabe (app/public/data/*.json).

export type ServiceId = "weekday" | "saturday";

export interface StopRef {
  seq: number;
  name: string;
  /** "an" | "ab" bei Haltestellen, die im Linienverlauf zweimal vorkommen (Knotenpunkte) */
  note?: "an" | "ab";
}

export interface TripTemplateMode {
  id: string;
  service: ServiceId;
  /** HH:MM Startzeit; wird mit offsetsMin der Linie kombiniert */
  start: string;
}

export interface TripLiteralMode {
  id: string;
  service: ServiceId;
  /**
   * Ein HH:MM Wert pro stops-Eintrag, exakt wie im PDF-Fahrplan gedruckt.
   * `null` bedeutet: diese Fahrt bedient diese Haltestelle nicht (z.B. Kurzfahrt/
   * "short working", die nicht die komplette Ringlinie fährt - kommt bei den letzten
   * Fahrten mancher Linien vor).
   */
  times: (string | null)[];
}

export type TripInput = TripTemplateMode | TripLiteralMode;

export interface LineInput {
  id: string;
  shortName: string;
  longName: string;
  color?: string;
  validFrom: string;
  source: "manual-pdf" | "gtfs.de";
  sourceFile?: string;
  notes?: string;
  stops: StopRef[];
  /** Minuten-Offsets ab Fahrtbeginn, ein Wert pro stops-Eintrag (Template-Modus) */
  offsetsMin?: number[];
  trips: TripInput[];
}

export interface AgencyInput {
  id: string;
  name: string;
  url: string;
  timezone: string;
  lang: string;
  phone?: string;
}

// ---- Output-Bundle (app/public/data/*.json) ----

export interface RouteOut {
  id: string;
  shortName: string;
  longName: string;
  color: string;
}

export interface StopOut {
  id: string;
  name: string;
  /** Aus OpenStreetMap (siehe fetchStopCoords.ts) - fehlt bei ~7% der Haltestellen */
  lat?: number;
  lon?: number;
}

/** Eine Abfahrt an einer konkreten Haltestelle, im Linienverlauf. */
export interface DepartureOut {
  tripId: string;
  routeId: string;
  service: ServiceId;
  /** HH:MM:SS, kann >24:00:00 sein bei Tagesüberlauf (hier aktuell ungenutzt, aber vorgesehen) */
  time: string;
  /** Position der Haltestelle im Linienverlauf dieser Fahrt (für "Richtung"/Endziel-Anzeige) */
  stopSeq: number;
  /** letzte Haltestelle der Fahrt, als Fahrtziel-Anzeige */
  headsign: string;
}

export interface CalendarOut {
  /** service id -> an diesen Wochentagen aktiv (0=So..6=Sa) */
  [service: string]: number[];
}

export interface MetaOut {
  generatedAt: string;
  source: "manual-pdf";
  disclaimer: string;
  attribution: string;
  lineCount: number;
}
