import { useSyncExternalStore } from "react";

/**
 * Favoriten-Haltestellen: einfacher externer Store (localStorage-gestützt), damit alle
 * Stern-Buttons auf der Seite (Suche, Abfahrtstafel, Startseite) konsistent bleiben, ohne
 * React-Context/State-Management-Library. useSyncExternalStore sorgt für korrekte
 * Re-Renders bei Änderungen, auch wenn mehrere Komponenten gleichzeitig lauschen.
 */
const STORAGE_KEY = "favorite-stops";

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

let favorites = load();
// useSyncExternalStore verlangt, dass getSnapshot() eine REFERENZSTABILE Rückgabe liefert,
// solange sich am Store nichts geändert hat - sonst hält React das bei jedem Render für
// eine neue Änderung und rendert endlos weiter (React error #185). Deshalb Array cachen
// und nur bei tatsächlicher Änderung neu erzeugen, statt bei jedem getSnapshot-Aufruf.
let favoritesSnapshot: string[] = [...favorites];
const listeners = new Set<() => void>();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
}

function notify() {
  favoritesSnapshot = [...favorites];
  for (const l of listeners) l();
}

export function toggleFavorite(stopId: string): void {
  if (favorites.has(stopId)) favorites.delete(stopId);
  else favorites.add(stopId);
  persist();
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string[] {
  return favoritesSnapshot;
}

const EMPTY: string[] = [];
function getServerSnapshot(): string[] {
  return EMPTY;
}

/** Aktuelle Liste der Favoriten-Haltestellen-IDs, reaktiv. */
export function useFavoriteIds(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsFavorite(stopId: string): boolean {
  return useFavoriteIds().includes(stopId);
}
