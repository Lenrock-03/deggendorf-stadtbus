import { createServer } from "node:http";
import { fetchDepartures, type TrainDeparture } from "./dbClient.js";
import { CACHE_TTL_MS } from "./constants.js";

let cache: { at: number; data: TrainDeparture[] } | null = null;

async function getDepartures(): Promise<TrainDeparture[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  const data = await fetchDepartures();
  cache = { at: Date.now(), data };
  return data;
}

const PORT = Number(process.env.PORT ?? 3000);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://internal");

  if (url.pathname === "/api/db/departures" && req.method === "GET") {
    try {
      const data = await getDepartures();
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(data));
    } catch (err) {
      console.error("Fehler bei /api/db/departures:", err);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Zugabfahrten konnten nicht geladen werden." }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(PORT, () => {
  console.log(`db-proxy läuft auf Port ${PORT}`);
});
