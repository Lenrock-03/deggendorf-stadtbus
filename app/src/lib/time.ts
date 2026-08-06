/**
 * Zeit-Hilfsfunktionen. Alle Fahrplanzeiten sind HH:MM:SS-Strings nach GTFS-Konvention:
 * Werte >= 24:00:00 sind gültig und bedeuten "nach Mitternacht, gehört aber noch zum
 * Betriebstag, der um 00:00 begann" (z.B. 25:30:00 = 01:30 Uhr des Folgetages).
 * Aktuell hat keine Deggendorfer Linie Fahrten nach Mitternacht, die Logik ist aber
 * bewusst allgemein gehalten.
 */

export function parseTimeToMinutes(hms: string): number {
  const [h, m] = hms.split(":").map(Number);
  return h * 60 + m;
}

export function formatMinutesAsClock(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Minuten seit Mitternacht (Europe/Berlin), unabhängig von der Zeitzone des Geräts. */
export function nowMinutesInBerlin(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

/** Wochentag (0=So..6=Sa) für "heute" in Europe/Berlin, unabhängig von der Geräte-Zeitzone. */
export function weekdayInBerlin(now: Date = new Date()): number {
  const weekdayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "short",
  }).format(now);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekdayStr] ?? now.getDay();
}
