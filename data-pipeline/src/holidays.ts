/**
 * Dritte Kopie der bayerischen Feiertags-/Schulferienlogik (neben app/src/lib/holidays.ts
 * und api/src/holidays.ts) - bewusst, nicht versehentlich dupliziert: diese Kopie läuft
 * zur BUILD-Zeit (generiert calendar_dates.txt-Ausnahmen für den GTFS-Export), die anderen
 * beiden zur LAUFZEIT (Abfahrtstafel). Bei Änderungen an der Feiertagslogik oder neuen
 * Schuljahren in SCHOOL_HOLIDAY_RANGES: alle drei Kopien nachziehen.
 */

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
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

export function bavarianPublicHolidays(year: number): Date[] {
  const easter = easterSunday(year);
  return [
    new Date(year, 0, 1),
    new Date(year, 0, 6),
    addDays(easter, -2),
    addDays(easter, 1),
    new Date(year, 4, 1),
    addDays(easter, 39),
    addDays(easter, 50),
    addDays(easter, 60),
    new Date(year, 7, 15),
    new Date(year, 9, 3),
    new Date(year, 10, 1),
    new Date(year, 11, 25),
    new Date(year, 11, 26),
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

/** Schulferien Bayern - Quelle: km.bayern.de/termine/ferien-und-feiertage. Enddatum
 * jeweils inklusive. Identisch zu app/src/lib/holidays.ts - bei Erweiterung dort auch
 * hier (und in api/src/holidays.ts) nachziehen. */
export const SCHOOL_HOLIDAY_RANGES: { start: string; end: string }[] = [
  { start: "2026-02-16", end: "2026-02-20" },
  { start: "2026-03-30", end: "2026-04-10" },
  { start: "2026-05-26", end: "2026-06-05" },
  { start: "2026-08-03", end: "2026-09-14" },
  { start: "2026-11-02", end: "2026-11-06" },
  { start: "2026-12-24", end: "2027-01-08" },
  { start: "2027-02-08", end: "2027-02-12" },
  { start: "2027-03-22", end: "2027-04-02" },
  { start: "2027-05-18", end: "2027-05-28" },
  { start: "2027-08-02", end: "2027-09-13" },
];

export function isSchoolHoliday(date: Date): boolean {
  const key = dateKey(date);
  return SCHOOL_HOLIDAY_RANGES.some((r) => key >= r.start && key <= r.end);
}

export function isSchoolDay(date: Date): boolean {
  const weekday = date.getDay();
  if (weekday === 0 || weekday === 6) return false;
  if (isPublicHoliday(date)) return false;
  if (isSchoolHoliday(date)) return false;
  return true;
}

export { dateKey, addDays };
