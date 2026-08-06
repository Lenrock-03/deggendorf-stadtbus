/**
 * Einmalig (manuell) auszuführen, um Haltestellen-Koordinaten aus OpenStreetMap zu holen
 * und als data-pipeline/fallback-data/stop-coords.json zu committen (kein Live-API-Call
 * zur Laufzeit der App). Erneut ausführen, falls neue Haltestellen dazukommen.
 *
 * Quelle: Overpass API (OpenStreetMap-Daten, ODbL-Lizenz - Attribution nötig, siehe
 * app/src/components/Layout.tsx / meta.json attribution).
 *
 * Matching-Strategie: exakter Namensabgleich (normalisiert) -> Teilstring-Fuzzy-Match ->
 * manuelle Alias-Tabelle für den Rest. Nicht auflösbare Haltestellen bleiben ohne
 * Koordinaten (App blendet sie bei "Standort verwenden" einfach aus, kein harter Fehler).
 */
import { writeFileSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { LineInput } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FALLBACK_DIR = join(__dirname, "..", "fallback-data");

// Deggendorf-Umkreis (großzügig, deckt auch Deggenau/Mietraching/Fischerdorf etc. ab)
const BBOX = { south: 48.79, west: 12.88, north: 48.89, east: 13.03 };

/** Für Haltestellen, die OSM unter einem anderen Namen führt (Busbahnhof-Bahnsteige,
 * Hauptbahnhof-Kurzform etc.) - Schlüssel = normalisierter eigener Name. */
const MANUAL_ALIASES: Record<string, string> = {
  "busbhf 9": "busbahnhof",
  "busbhf 1": "busbahnhof",
  "hbf": "hauptbahnhof",
};

interface OverpassElement {
  lat: number;
  lon: number;
  tags?: { name?: string };
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/^deggendorf,?\s*/, "")
    .replace(/straße/g, "str")
    .replace(/strasse/g, "str")
    .replace(/[^a-z0-9äöüß]+/g, " ")
    .trim();
}

function allStopNames(): string[] {
  const dir = join(FALLBACK_DIR, "lines");
  const names = new Set<string>();
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const line: LineInput = JSON.parse(readFileSync(join(dir, f), "utf-8"));
    for (const s of line.stops) names.add(s.name);
  }
  return [...names];
}

async function fetchOsmStops(): Promise<OverpassElement[]> {
  const query = `[out:json][timeout:30];(node["highway"="bus_stop"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});node["public_transport"="platform"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}););out body;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "deggendorf-stadtbus-app (build-time stop coord fetch)",
    },
  });
  if (!res.ok) throw new Error(`Overpass API: HTTP ${res.status}`);
  const data = (await res.json()) as { elements: OverpassElement[] };
  return data.elements;
}

function average(coords: { lat: number; lon: number }[]) {
  const lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
  const lon = coords.reduce((s, c) => s + c.lon, 0) / coords.length;
  return { lat, lon };
}

async function main() {
  console.log("Lade Haltestellen von Overpass API (OpenStreetMap) ...");
  const elements = await fetchOsmStops();
  console.log(`${elements.length} OSM-Knoten geladen.`);

  const osmByNorm = new Map<string, { lat: number; lon: number }[]>();
  for (const el of elements) {
    const name = el.tags?.name;
    if (!name) continue;
    const key = norm(name);
    (osmByNorm.get(key) ?? osmByNorm.set(key, []).get(key)!).push({ lat: el.lat, lon: el.lon });
  }

  const ourNames = allStopNames();
  const result: Record<string, { lat: number; lon: number }> = {};
  const unmatched: string[] = [];

  for (const name of ourNames) {
    const key = norm(name);
    let coords = osmByNorm.get(key);
    if (!coords && MANUAL_ALIASES[key]) coords = osmByNorm.get(MANUAL_ALIASES[key]);
    if (!coords) {
      for (const [osmKey, c] of osmByNorm) {
        if (osmKey.includes(key) || key.includes(osmKey)) {
          coords = c;
          break;
        }
      }
    }
    if (coords && coords.length > 0) {
      result[name] = average(coords);
    } else {
      unmatched.push(name);
    }
  }

  console.log(`Zugeordnet: ${Object.keys(result).length} / ${ourNames.length}`);
  if (unmatched.length > 0) {
    console.log("Ohne Koordinaten (bleiben in der App ohne Standort-Distanz):");
    for (const n of unmatched) console.log("  -", n);
  }

  const outPath = join(FALLBACK_DIR, "stop-coords.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`-> ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
