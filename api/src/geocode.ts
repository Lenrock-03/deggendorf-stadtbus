// Adress-Geocoding über Nominatim (OpenStreetMap) - kostenlos, kein API-Key nötig, passt zur
// bisherigen OSM-Nutzung (osmdroid in der Android-Kartenansicht, Leaflet in der Web-App).
// Nutzungsrichtlinien des öffentlichen Nominatim-Dienstes (operations.osmfoundation.org/
// policies/nominatim/): max. 1 Anfrage/Sekunde, aussagekräftiger User-Agent Pflicht, kein
// automatisiertes Bulk-Geocoding. Hier unproblematisch, da jede Anfrage eine einzelne
// Nutzereingabe in der Verbindungssuche ist (zusätzlich per Cache unten entschärft).
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "deggendorf-stadtbus/1.0 (+https://deggendorf-stadtbus.kornel-riedl.de)";

// Grobe Bounding Box um Deggendorf (Hbf liegt bei 48.839/12.950, siehe constants.ts-Kommentar)
// - schränkt Nominatim-Ergebnisse nicht hart ein (bounded=0), gewichtet sie aber zur Region,
// damit z.B. "Further Straße" nicht in einer gleichnamigen Straße einer anderen Stadt landet.
// Format: links,oben,rechts,unten (Nominatim erwartet je Ecke ein lon,lat-Paar).
const VIEWBOX = "12.80,48.95,13.10,48.72";

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
}

// Einfacher In-Memory-Cache (normalisierte Query -> Ergebnis, auch "nicht gefunden" als null) -
// reicht für den Anwendungsfall (wenige Nutzer, Tippen/Löschen derselben Adresse während der
// Eingabe), kein Redis o.ä. nötig. Kein TTL: Adress-Koordinaten ändern sich nicht.
const cache = new Map<string, GeocodeResult | null>();

/** Löst eine Adresseingabe zu Koordinaten auf, oder null wenn nichts gefunden wurde. */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "de");
  url.searchParams.set("viewbox", VIEWBOX);

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "de" } });
  if (!res.ok) throw new Error(`Nominatim: HTTP ${res.status}`);
  const hits = (await res.json()) as NominatimHit[];
  const hit = hits[0];
  const result = hit ? { lat: Number(hit.lat), lon: Number(hit.lon), displayName: hit.display_name } : null;
  cache.set(key, result);
  return result;
}
