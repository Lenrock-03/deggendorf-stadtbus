import { createServer } from "node:http";
import { fetchDepartures, type TrainDeparture } from "./dbClient.js";
import { CACHE_TTL_MS } from "./constants.js";
import { loadScheduleBundle } from "./schedule.js";
import {
  ApiError,
  getJourneys,
  getMeta,
  getRouteOutline,
  getRoutes,
  getRouteTimeline,
  getRouteTrips,
  getStopDepartures,
  getStops,
  getStopsNearest,
  getStopsSearch,
} from "./routes.js";

// Einmalig beim Start laden (kleine Datenmenge, synchron) - schlägt der Prozess hier fehl,
// lieber sofort beim Start crashen (Docker/systemd startet neu) als leise mit einer leeren/
// kaputten API weiterlaufen.
const bundle = loadScheduleBundle();
console.log(`Fahrplan-Bundle geladen: ${bundle.routes.length} Linien, ${bundle.stops.length} Haltestellen`);

let dbCache: { at: number; data: TrainDeparture[] } | null = null;

async function getDbDepartures(): Promise<TrainDeparture[]> {
  if (dbCache && Date.now() - dbCache.at < CACHE_TTL_MS) return dbCache.data;
  const data = await fetchDepartures();
  dbCache = { at: Date.now(), data };
  return data;
}

// Schlanker Regex-basierter Router statt Framework (siehe api/README bzw. Plan - bewusst
// dependency-arm gehalten, analog zur data-pipeline-Konvention). Jeder Eintrag: Methode,
// Pfad-Pattern (mit ()-Gruppen für Parameter) und ein Handler, der die gematchten Gruppen
// plus die URL (für Query-Parameter) bekommt.
type Handler = (params: string[], url: URL) => unknown;
const routes: { method: string; pattern: RegExp; handler: Handler }[] = [
  { method: "GET", pattern: /^\/api\/routes$/, handler: () => getRoutes(bundle) },
  { method: "GET", pattern: /^\/api\/routes\/([^/]+)\/outline$/, handler: ([id]) => getRouteOutline(bundle, id) },
  { method: "GET", pattern: /^\/api\/routes\/([^/]+)\/trips$/, handler: ([id]) => getRouteTrips(bundle, id) },
  {
    method: "GET",
    pattern: /^\/api\/routes\/([^/]+)\/timeline$/,
    handler: ([id], url) => getRouteTimeline(bundle, id, url),
  },
  { method: "GET", pattern: /^\/api\/stops$/, handler: () => getStops(bundle) },
  { method: "GET", pattern: /^\/api\/stops\/search$/, handler: (_p, url) => getStopsSearch(bundle, url) },
  { method: "GET", pattern: /^\/api\/stops\/nearest$/, handler: (_p, url) => getStopsNearest(bundle, url) },
  {
    method: "GET",
    pattern: /^\/api\/stops\/([^/]+)\/departures$/,
    handler: ([id], url) => getStopDepartures(bundle, id, url),
  },
  { method: "GET", pattern: /^\/api\/journeys$/, handler: (_p, url) => getJourneys(bundle, url) },
  { method: "GET", pattern: /^\/api\/meta$/, handler: () => getMeta(bundle) },
  { method: "GET", pattern: /^\/api\/db\/departures$/, handler: () => getDbDepartures() },
];

const PORT = Number(process.env.PORT ?? 3000);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://internal");

  const match = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));
  if (!match) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }

  try {
    const params = match.pattern.exec(url.pathname)!.slice(1);
    const data = await match.handler(params, url);
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(data));
  } catch (err) {
    if (err instanceof ApiError) {
      res.writeHead(err.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
    console.error(`Fehler bei ${req.method} ${url.pathname}:`, err);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Interner Fehler" }));
  }
});

server.listen(PORT, () => {
  console.log(`api läuft auf Port ${PORT}`);
});
