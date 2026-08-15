import type { CalendarData, DepartureData } from "./types.js";
import { addDays, dateInBerlin, nowMinutesInBerlin, parseTimeToMinutes } from "./time.js";
import { isPublicHoliday, isSchoolDay } from "./holidays.js";

/**
 * Liefert die an einem gegebenen Wochentag aktiven service-ids, ohne Rücksicht auf
 * Feiertage/Ferien - reine Wochentags-Regel. weekday = 0 (So) .. 6 (Sa), analog
 * JS Date#getDay(). Meist ist `activeServicesForDate` die richtige Wahl, diese Funktion
 * ist der Baustein dafür (und für Fälle, wo bewusst nur der Wochentag zählt).
 */
export function activeServicesForWeekday(calendar: CalendarData, weekday: number): string[] {
  return Object.entries(calendar)
    .filter(([, days]) => days.includes(weekday))
    .map(([service]) => service);
}

/**
 * Liefert die an einem konkreten Kalendertag aktiven service-ids, inkl. Feiertags- und
 * Heiligabend/Silvester-Sonderregeln (siehe holidays.ts):
 * - gesetzlicher Feiertag -> kein Verkehr (wie ein Sonntag)
 * - 24.12./31.12., sofern nicht selbst ein Sonntag -> Samstagsfahrplan
 * - sonst -> normale Wochentags-Regel
 */
export function activeServicesForDate(calendar: CalendarData, date: Date): string[] {
  const weekday = date.getDay();
  const isHeiligabendOderSilvester =
    (date.getMonth() === 11 && date.getDate() === 24) || (date.getMonth() === 11 && date.getDate() === 31);

  if (isHeiligabendOderSilvester && weekday !== 0) {
    return activeServicesForWeekday(calendar, 6); // Samstagsfahrplan
  }
  if (isPublicHoliday(date)) {
    return [];
  }
  const services = activeServicesForWeekday(calendar, weekday);
  // "schoolday"-Fahrten (Linie 2) nur an tatsächlichen Schultagen - Ferien/Feiertage raus,
  // obwohl der Wochentag selbst zum Grundmuster passt.
  return isSchoolDay(date) ? services : services.filter((s) => s !== "schoolday");
}

export function activeServicesToday(calendar: CalendarData, now: Date = new Date()): string[] {
  return activeServicesForDate(calendar, dateInBerlin(now));
}

/**
 * Alle Abfahrten einer Haltestelle für die aktiven Services eines Kalendertags,
 * chronologisch sortiert.
 */
export function departuresForDate(
  stopDepartures: DepartureData[],
  calendar: CalendarData,
  date: Date
): DepartureData[] {
  const active = new Set(activeServicesForDate(calendar, date));
  return stopDepartures
    .filter((d) => active.has(d.service))
    .slice()
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
}

/** @deprecated Nur noch für Tests/Altlogik - nutzt keine Feiertagsregeln. Für die
 * Anzeige immer `departuresForDate` verwenden. */
export function departuresForWeekday(
  stopDepartures: DepartureData[],
  calendar: CalendarData,
  weekday: number
): DepartureData[] {
  const active = new Set(activeServicesForWeekday(calendar, weekday));
  return stopDepartures
    .filter((d) => active.has(d.service))
    .slice()
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
}

/**
 * Nächste N Abfahrten ab "jetzt" (Europe/Berlin). Berücksichtigt Zeiten >24:00:00
 * (Fahrten, die nach Mitternacht noch zum Vortag gehören), den Fall, dass eine
 * "gestrige" Fahrt mit Überlaufzeit gerade jetzt noch relevant ist, sowie Feiertage/
 * Heiligabend/Silvester (siehe activeServicesForDate).
 */
export function nextDepartures(
  stopDepartures: DepartureData[],
  calendar: CalendarData,
  now: Date = new Date(),
  count = 8
): DepartureData[] {
  const nowMin = nowMinutesInBerlin(now);
  const today = dateInBerlin(now);
  const yesterday = addDays(today, -1);

  // Nur "normale" Zeiten des heutigen Betriebstags (< 24:00); Zeiten >= 24:00 gehören
  // zum morgigen Kalendertag früh und würden sonst fälschlich doppelt auftauchen (einmal
  // hier als "heute", einmal morgen als eigener Überlauf von morgens Kalendertag).
  const todays = departuresForDate(stopDepartures, calendar, today).filter(
    (d) => parseTimeToMinutes(d.time) >= nowMin && parseTimeToMinutes(d.time) < 1440
  );

  // Fahrten von "gestern", die erst nach Mitternacht ankommen (Zeit >= 24:00) und daher
  // gerade jetzt (kurz nach Mitternacht) noch anstehen können. Für den chronologischen
  // Vergleich mit "heutigen" Zeiten auf den heutigen Kalendertag normalisiert (-1440),
  // sonst würde z.B. gestern 25:10 (=heute 01:10) fälschlich NACH heute 23:50 einsortiert.
  const yesterdaysOverflow = departuresForDate(stopDepartures, calendar, yesterday)
    .filter((d) => parseTimeToMinutes(d.time) >= 1440)
    .filter((d) => parseTimeToMinutes(d.time) - 1440 >= nowMin);

  const effectiveMinutes = (d: DepartureData, isOverflow: boolean) =>
    isOverflow ? parseTimeToMinutes(d.time) - 1440 : parseTimeToMinutes(d.time);

  return [
    ...yesterdaysOverflow.map((d) => ({ d, key: effectiveMinutes(d, true) })),
    ...todays.map((d) => ({ d, key: effectiveMinutes(d, false) })),
  ]
    .sort((a, b) => a.key - b.key)
    .map(({ d }) => d)
    .slice(0, count);
}
