import type { StopData } from "../types/data";

/** Haversine-Formel: Entfernung zweier Koordinaten in Metern. */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface StopWithDistance extends StopData {
  distanceM: number;
}

/**
 * Haltestellen mit bekannten Koordinaten, sortiert nach Entfernung zu (lat, lon).
 * Haltestellen ohne Koordinaten (siehe fetchStopCoords.ts) werden übersprungen, nicht
 * als "unendlich weit weg" einsortiert.
 */
export function nearestStops(
  stops: StopData[],
  lat: number,
  lon: number,
  count = 15
): StopWithDistance[] {
  return stops
    .filter((s): s is StopData & { lat: number; lon: number } => s.lat != null && s.lon != null)
    .map((s) => ({ ...s, distanceM: distanceMeters(lat, lon, s.lat, s.lon) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, count);
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
