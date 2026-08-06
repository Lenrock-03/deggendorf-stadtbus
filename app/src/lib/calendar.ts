import type { CalendarData, DepartureData } from "../types/data";
import { nowMinutesInBerlin, parseTimeToMinutes, weekdayInBerlin } from "./time";

/**
 * Liefert die an einem gegebenen Wochentag aktiven service-ids.
 * weekday = 0 (So) .. 6 (Sa), analog JS Date#getDay().
 *
 * Bewusst einfach gehalten für v1: reine Wochentags-Regel, keine Feiertags-/
 * Ferienkalender-Ausnahmen (alle 4 Linien fahren an Sonn-/Feiertagen ohnehin nicht,
 * an Heiligabend/Silvester wie Samstag - diese Spezialfälle sind hier noch nicht
 * automatisiert und werden im UI als Hinweis ausgewiesen).
 */
export function activeServicesForWeekday(calendar: CalendarData, weekday: number): string[] {
  return Object.entries(calendar)
    .filter(([, days]) => days.includes(weekday))
    .map(([service]) => service);
}

export function activeServicesToday(calendar: CalendarData, now: Date = new Date()): string[] {
  return activeServicesForWeekday(calendar, weekdayInBerlin(now));
}

/**
 * Alle Abfahrten einer Haltestelle für die aktiven Services eines Wochentags,
 * chronologisch sortiert.
 */
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
 * (Fahrten, die nach Mitternacht noch zum Vortag gehören) sowie den Fall, dass eine
 * "gestrige" Fahrt mit Überlaufzeit gerade jetzt noch relevant ist.
 */
export function nextDepartures(
  stopDepartures: DepartureData[],
  calendar: CalendarData,
  now: Date = new Date(),
  count = 8
): DepartureData[] {
  const nowMin = nowMinutesInBerlin(now);
  const todayWeekday = weekdayInBerlin(now);
  const yesterdayWeekday = (todayWeekday + 6) % 7;

  // Nur "normale" Zeiten des heutigen Betriebstags (< 24:00); Zeiten >= 24:00 gehören
  // zum morgigen Kalendertag früh und würden sonst fälschlich doppelt auftauchen (einmal
  // hier als "heute", einmal morgen als eigener Überlauf von morgens Kalendertag).
  const todays = departuresForWeekday(stopDepartures, calendar, todayWeekday).filter(
    (d) => parseTimeToMinutes(d.time) >= nowMin && parseTimeToMinutes(d.time) < 1440
  );

  // Fahrten von "gestern", die erst nach Mitternacht ankommen (Zeit >= 24:00) und daher
  // gerade jetzt (kurz nach Mitternacht) noch anstehen können. Für den chronologischen
  // Vergleich mit "heutigen" Zeiten auf den heutigen Kalendertag normalisiert (-1440),
  // sonst würde z.B. gestern 25:10 (=heute 01:10) fälschlich NACH heute 23:50 einsortiert.
  const yesterdaysOverflow = departuresForWeekday(stopDepartures, calendar, yesterdayWeekday)
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
