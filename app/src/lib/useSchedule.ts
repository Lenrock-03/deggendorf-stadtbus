import { useEffect, useState } from "react";
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

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

let cached: ScheduleBundle | null = null;
let inFlight: Promise<ScheduleBundle> | null = null;

async function loadBundle(): Promise<ScheduleBundle> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const [routes, stops, departures, calendar, meta, routeStops] = await Promise.all([
      fetchJson<RouteData[]>("routes.json"),
      fetchJson<StopData[]>("stops.json"),
      fetchJson<DeparturesByStop>("departures.json"),
      fetchJson<CalendarData>("calendar.json"),
      fetchJson<MetaData>("meta.json"),
      fetchJson<RouteStops>("routeStops.json"),
    ]);
    cached = { routes, stops, departures, calendar, meta, routeStops };
    return cached;
  })();
  return inFlight;
}

/** Lädt das Fahrplan-Datenbundle einmalig und cached es im Modul-Scope (kein State-Management nötig). */
export function useSchedule(): LoadState {
  const [state, setState] = useState<LoadState>(cached ? { status: "ready", data: cached } : { status: "loading" });

  useEffect(() => {
    if (cached) {
      setState({ status: "ready", data: cached });
      return;
    }
    let cancelled = false;
    loadBundle()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
