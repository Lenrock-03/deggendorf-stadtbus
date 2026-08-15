import { useSyncExternalStore } from "react";
import type {
  CalendarData,
  DeparturesByStop,
  MetaData,
  RouteData,
  RouteStops,
  ScheduleBundle,
  StopData,
} from "../types/data";

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: ScheduleBundle };

const BASE = import.meta.env.BASE_URL;

// Im Capacitor-Android-Build ist BASE "/" und liefert das lokal in die APK gebündelte
// data/*.json (Stand vom letzten Build - siehe vite.config.ts). Damit die App trotzdem
// halbwegs aktuelle Daten bekommt, ohne neu gebaut/installiert werden zu müssen, wird
// zusätzlich einmal im Hintergrund die Live-Version von der echten Domain nachgeladen und
// übernommen, falls das klappt (Network-First-mit-lokalem-Fallback - der lokale Bundle-
// Stand ist der Fallback, nicht umgekehrt, damit die App auch ganz ohne Internet sofort
// nutzbar ist).
const isCapacitor = import.meta.env.VITE_CAPACITOR === "1";
const LIVE_ORIGIN = "https://deggendorf-stadtbus.kornel-riedl.de/";

async function fetchJson<T>(base: string, path: string): Promise<T> {
  const res = await fetch(`${base}data/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchBundle(base: string): Promise<ScheduleBundle> {
  const [routes, stops, departures, calendar, meta, routeStops] = await Promise.all([
    fetchJson<RouteData[]>(base, "routes.json"),
    fetchJson<StopData[]>(base, "stops.json"),
    fetchJson<DeparturesByStop>(base, "departures.json"),
    fetchJson<CalendarData>(base, "calendar.json"),
    fetchJson<MetaData>(base, "meta.json"),
    fetchJson<RouteStops>(base, "routeStops.json"),
  ]);
  return { routes, stops, departures, calendar, meta, routeStops };
}

let state: LoadState = { status: "loading" };
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: LoadState) {
  state = next;
  for (const l of listeners) l();
}

function loadBundle(): Promise<void> {
  if (state.status === "ready" || inFlight) return inFlight ?? Promise.resolve();
  inFlight = (async () => {
    try {
      const data = await fetchBundle(BASE);
      setState({ status: "ready", data });
      if (isCapacitor) refreshFromLiveOrigin();
    } catch (err: unknown) {
      setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  })();
  return inFlight;
}

/** Nur Capacitor: versucht still im Hintergrund die aktuelle Live-Version zu laden und
 * ersetzt die gebündelte Version bei Erfolg. Schlägt der Versuch fehl (kein Internet),
 * bleibt einfach der bereits angezeigte Bundle-Stand bestehen - kein Fehlerzustand. */
async function refreshFromLiveOrigin() {
  try {
    const data = await fetchBundle(LIVE_ORIGIN);
    setState({ status: "ready", data });
  } catch {
    // Kein Internet oder Live-Seite nicht erreichbar - gebündelter Stand bleibt einfach aktiv.
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  loadBundle();
  return () => listeners.delete(listener);
}

function getSnapshot(): LoadState {
  return state;
}

const SERVER_SNAPSHOT: LoadState = { status: "loading" };
function getServerSnapshot(): LoadState {
  return SERVER_SNAPSHOT;
}

/** Lädt das Fahrplan-Datenbundle einmalig und cached es im Modul-Scope (kein State-Management nötig). */
export function useSchedule(): LoadState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
