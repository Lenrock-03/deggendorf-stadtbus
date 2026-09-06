export interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
}

/**
 * Deggendorf und nähere Umgebung (Fischerdorf, Natternberg, Mietraching, THD, ...) - grob aus
 * dem Koordinatenbereich der bekannten Haltestellen (siehe stops.json, lat 48.814-48.873,
 * lon 12.938-12.997) plus etwas Rand für Wohnadressen knapp außerhalb der letzten Haltestelle.
 */
const VIEWBOX = { lonMin: 12.91, latMin: 48.79, lonMax: 13.02, latMax: 48.895 };

const cache = new Map<string, GeocodeResult[]>();

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  footway?: string;
  house_number?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

function shortLabel(r: NominatimResult): string {
  const a = r.address ?? {};
  const street = a.road ?? a.pedestrian ?? a.footway ?? "";
  const streetPart = [street, a.house_number].filter(Boolean).join(" ");
  const place = a.suburb ?? a.village ?? a.town ?? a.city ?? "";
  return [streetPart, place].filter(Boolean).join(", ") || r.display_name;
}

/**
 * Adresssuche über die öffentliche Nominatim-API (OpenStreetMap) - dieselbe Datenquelle wie
 * die Kartenkacheln in MapView.tsx, deshalb bewusst kein zusätzlicher API-Key/eigenes Backend
 * nötig (passt zur "app/ läuft komplett ohne Server-Abhängigkeit"-Linie, siehe CLAUDE.md).
 * Ergebnisse per viewbox+bounded auf die Region um Deggendorf begrenzt, damit z.B.
 * "Ringstraße" nicht Treffer aus ganz Deutschland liefert.
 *
 * Kein eingebautes Rate-Limiting außer dem simplen In-Memory-Cache pro Suchtext - Aufrufer
 * müssen selbst debouncen (siehe useAddressSearch.ts), damit die Nominatim-Nutzungsregeln
 * (max. ~1 Anfrage/Sekunde) bei normaler Tippgeschwindigkeit eingehalten werden.
 */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    format: "jsonv2",
    q,
    countrycodes: "de",
    viewbox: `${VIEWBOX.lonMin},${VIEWBOX.latMax},${VIEWBOX.lonMax},${VIEWBOX.latMin}`,
    bounded: "1",
    addressdetails: "1",
    limit: "5",
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
  if (!res.ok) throw new Error(`Adresssuche fehlgeschlagen (${res.status})`);
  const data = (await res.json()) as NominatimResult[];

  const seenLabels = new Set<string>();
  const results: GeocodeResult[] = data
    .map((r) => ({ label: shortLabel(r), lat: Number(r.lat), lon: Number(r.lon) }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon))
    // Nominatim liefert für eine Straße oft mehrere Punkte (Hausnummern-Bereiche, Wegstücke)
    // mit identischem Kurzlabel - für die Vorschlagsliste reicht der erste (nächstgelegene
    // Ergebnisse zuerst laut Nominatim-Relevanzsortierung).
    .filter((r) => {
      if (seenLabels.has(r.label)) return false;
      seenLabels.add(r.label);
      return true;
    });

  cache.set(cacheKey, results);
  return results;
}
