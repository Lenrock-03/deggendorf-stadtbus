/**
 * Bayerische Feiertage (gesetzlich, inkl. der in Bayern landesweiten Fronleichnam/Mariä
 * Himmelfahrt/Allerheiligen) und Schulferien.
 *
 * Feiertage werden berechnet (Gauß'sche Osterformel für die beweglichen Feiertage) -
 * gilt für jedes Jahr automatisch korrekt. Schulferien können nicht berechnet werden
 * (jährlich vom Kultusministerium neu festgelegt) und stehen daher als Datentabelle
 * unten - Quelle: km.bayern.de/termine/ferien-und-feiertage. Bei Bedarf für weitere
 * Schuljahre ergänzen.
 */

import { addDays } from "./time";

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ostersonntag (gregorianisch) nach der Gauß'schen Osterformel. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Alle gesetzlichen Feiertage in Bayern (inkl. Mariä Himmelfahrt, in Deggendorf/
 * Niederbayern als katholisch geprägter Region ein gesetzlicher Feiertag) für ein Jahr. */
export function bavarianPublicHolidays(year: number): Date[] {
  const easter = easterSunday(year);
  return [
    new Date(year, 0, 1), // Neujahr
    new Date(year, 0, 6), // Heilige Drei Könige
    addDays(easter, -2), // Karfreitag
    addDays(easter, 1), // Ostermontag
    new Date(year, 4, 1), // Tag der Arbeit
    addDays(easter, 39), // Christi Himmelfahrt
    addDays(easter, 50), // Pfingstmontag
    addDays(easter, 60), // Fronleichnam
    new Date(year, 7, 15), // Mariä Himmelfahrt
    new Date(year, 9, 3), // Tag der Deutschen Einheit
    new Date(year, 10, 1), // Allerheiligen
    new Date(year, 11, 25), // 1. Weihnachtsfeiertag
    new Date(year, 11, 26), // 2. Weihnachtsfeiertag
  ];
}

let holidayCache: { year: number; keys: Set<string> } | null = null;

export function isPublicHoliday(date: Date): boolean {
  const year = date.getFullYear();
  if (holidayCache?.year !== year) {
    holidayCache = { year, keys: new Set(bavarianPublicHolidays(year).map(dateKey)) };
  }
  return holidayCache.keys.has(dateKey(date));
}

/** Schulferien Bayern - Datenquelle: km.bayern.de/termine/ferien-und-feiertage (Stand: 2026).
 * Enddatum jeweils inklusive (letzter Ferientag). */
const SCHOOL_HOLIDAY_RANGES: { start: string; end: string }[] = [
  // Schuljahr 2025/26
  { start: "2026-02-16", end: "2026-02-20" }, // Winterferien (Fasching)
  { start: "2026-03-30", end: "2026-04-10" }, // Osterferien
  { start: "2026-05-26", end: "2026-06-05" }, // Pfingstferien
  { start: "2026-08-03", end: "2026-09-14" }, // Sommerferien
  { start: "2026-11-02", end: "2026-11-06" }, // Herbstferien
  { start: "2026-12-24", end: "2027-01-08" }, // Weihnachtsferien 2026/27
  // Schuljahr 2026/27 (Fortsetzung)
  { start: "2027-02-08", end: "2027-02-12" }, // Frühjahrsferien
  { start: "2027-03-22", end: "2027-04-02" }, // Osterferien
  { start: "2027-05-18", end: "2027-05-28" }, // Pfingstferien
  { start: "2027-08-02", end: "2027-09-13" }, // Sommerferien
];

export function isSchoolHoliday(date: Date): boolean {
  const key = dateKey(date);
  return SCHOOL_HOLIDAY_RANGES.some((r) => key >= r.start && key <= r.end);
}

/** Ist an diesem Tag Schule (kein Feiertag, kein Wochenende, keine Ferien)? Für Linie 2s
 * Schultag-only-Fahrten (siehe fallback-data/lines/linie-2.json bzw. Pipeline). */
export function isSchoolDay(date: Date): boolean {
  const weekday = date.getDay();
  if (weekday === 0 || weekday === 6) return false;
  if (isPublicHoliday(date)) return false;
  if (isSchoolHoliday(date)) return false;
  return true;
}
