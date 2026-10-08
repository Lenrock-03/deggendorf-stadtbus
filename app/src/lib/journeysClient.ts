import type { Journey } from "./routePlanner";

// Normalerweise lädt app/ Daten ausschließlich statisch (siehe CLAUDE.md) - dieser Aufruf
// ist bewusst die eine Ausnahme: die Verbindungssuche versucht zuerst die über Motis
// laufende Live-Routenberechnung (api/), fällt bei Fehlschlag/Timeout aber automatisch auf
// die lokale findJourneys()-Berechnung zurück (siehe RoutePlanner.tsx) - alles andere in der
// App bleibt rein statisch.
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const REQUEST_TIMEOUT_MS = 3_000;

export class JourneysOnlineError extends Error {}

/** `date` als "YYYY-MM-DD", `afterMin` als Minuten seit Mitternacht - exakt das Format,
 * das GET /api/journeys erwartet (siehe api/src/routes.ts getJourneys). */
export async function fetchJourneysOnline(
  fromStopId: string,
  toStopId: string,
  dateStr: string,
  afterMin: number
): Promise<Journey[]> {
  const url = new URL(`${API_BASE}/journeys`, window.location.origin);
  url.searchParams.set("from", fromStopId);
  url.searchParams.set("to", toStopId);
  url.searchParams.set("date", dateStr);
  url.searchParams.set("afterMin", String(afterMin));

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    throw new JourneysOnlineError(err instanceof Error ? err.message : String(err));
  }
  if (!res.ok) {
    throw new JourneysOnlineError(`HTTP ${res.status}`);
  }
  return (await res.json()) as Journey[];
}
