import { describe, expect, it } from "vitest";
import { activeServicesForDate, activeServicesForWeekday, departuresForDate, departuresForWeekday, nextDepartures } from "./calendar";
import type { CalendarData, DepartureData } from "../types/data";

const calendar: CalendarData = {
  weekday: [1, 2, 3, 4, 5],
  saturday: [6],
  schoolday: [1, 2, 3, 4, 5],
};

const dep = (time: string, service: "weekday" | "saturday" = "weekday"): DepartureData => ({
  tripId: `t-${time}-${service}`,
  routeId: "4",
  service,
  time,
  stopSeq: 1,
  headsign: "Zentrum",
});

describe("activeServicesForWeekday", () => {
  it("liefert 'weekday' und 'schoolday' für Montag-Freitag (reine Wochentags-Regel, ohne Ferien-/Feiertagsfilter)", () => {
    for (const wd of [1, 2, 3, 4, 5]) {
      expect(activeServicesForWeekday(calendar, wd)).toEqual(["weekday", "schoolday"]);
    }
  });

  it("liefert 'saturday' für Samstag", () => {
    expect(activeServicesForWeekday(calendar, 6)).toEqual(["saturday"]);
  });

  it("liefert nichts für Sonntag", () => {
    expect(activeServicesForWeekday(calendar, 0)).toEqual([]);
  });
});

describe("departuresForWeekday", () => {
  it("filtert nach aktivem Service und sortiert chronologisch", () => {
    const deps = [dep("14:30:00"), dep("09:30:00"), dep("08:00:00", "saturday")];
    const result = departuresForWeekday(deps, calendar, 3); // Mittwoch
    expect(result.map((d) => d.time)).toEqual(["09:30:00", "14:30:00"]);
  });

  it("gibt an Sonntag keine Abfahrten zurück, auch wenn welche existieren", () => {
    const deps = [dep("09:30:00"), dep("08:00:00", "saturday")];
    expect(departuresForWeekday(deps, calendar, 0)).toEqual([]);
  });
});

describe("activeServicesForDate", () => {
  it("liefert nichts an einem gesetzlichen Feiertag, auch wenn er auf einen Werktag fällt", () => {
    // 25.12.2026 ist ein Freitag (normaler Werktag), aber 1. Weihnachtsfeiertag
    expect(activeServicesForDate(calendar, new Date(2026, 11, 25))).toEqual([]);
  });

  it("liefert den Samstagsfahrplan an Heiligabend, auch wenn der auf einen Werktag fällt", () => {
    // 24.12.2026 ist ein Donnerstag
    expect(activeServicesForDate(calendar, new Date(2026, 11, 24))).toEqual(["saturday"]);
  });

  it("liefert den Samstagsfahrplan an Silvester, auch wenn der auf einen Werktag fällt", () => {
    // 31.12.2026 ist ein Donnerstag
    expect(activeServicesForDate(calendar, new Date(2026, 11, 31))).toEqual(["saturday"]);
  });

  it("liefert nichts, wenn Heiligabend/Silvester selbst auf einen Sonntag fällt", () => {
    // 24.12.2028 ist ein Sonntag
    expect(activeServicesForDate(calendar, new Date(2028, 11, 24))).toEqual([]);
  });

  it("liefert die normale Wochentags-Regel an einem gewöhnlichen Tag inkl. 'schoolday' (echter Schultag)", () => {
    expect(activeServicesForDate(calendar, new Date(2026, 2, 10))).toEqual(["weekday", "schoolday"]); // Dienstag, Schultag
  });

  it("filtert 'schoolday' während der Sommerferien heraus, 'weekday' bleibt", () => {
    // 06.08.2026, Donnerstag, mitten in den bayerischen Sommerferien
    expect(activeServicesForDate(calendar, new Date(2026, 7, 6))).toEqual(["weekday"]);
  });

  it("filtert 'schoolday' an einem Feiertag ebenfalls (kompletter Verkehr steht dann aber ohnehin still)", () => {
    expect(activeServicesForDate(calendar, new Date(2026, 4, 25))).toEqual([]); // Pfingstmontag 2026
  });
});

describe("departuresForDate", () => {
  it("berücksichtigt Feiertage (kein Verkehr), obwohl die reine Wochentags-Regel etwas liefern würde", () => {
    const deps = [dep("09:30:00")];
    expect(departuresForDate(deps, calendar, new Date(2026, 11, 25))).toEqual([]); // 1. Weihnachtsfeiertag
  });
});

describe("nextDepartures", () => {
  it("gibt nur Abfahrten ab 'jetzt' zurück", () => {
    const deps = [dep("08:00:00"), dep("09:30:00"), dep("14:30:00"), dep("16:30:00")];
    // Mittwoch, 10:00 Uhr Berlin-Zeit -> Datum so wählen, dass es lokal Mittwoch 10:00 ist
    const now = new Date("2026-08-05T08:00:00Z"); // 05.08.2026 ist ein Mittwoch, 08:00 UTC = 10:00 Berlin (Sommerzeit)
    const result = nextDepartures(deps, calendar, now);
    expect(result.map((d) => d.time)).toEqual(["14:30:00", "16:30:00"]);
  });

  it("berücksichtigt Tagesüberlauf (Zeiten >= 24:00:00) aus dem Vortag und sortiert chronologisch korrekt", () => {
    const deps = [dep("23:50:00"), dep("25:10:00")]; // 25:10 = 01:10 Uhr Folgetag
    // Donnerstag 00:30 Uhr Berlin: die "gestrige" (Mittwoch-)Fahrt 25:10 (=heute 01:10, in 40 Min.)
    // muss VOR der heutigen (Donnerstag-)Fahrt 23:50 (in fast 23,5 Std.) stehen.
    const now = new Date("2026-08-06T22:30:00Z"); // 06.08. 22:30 UTC = 07.08. 00:30 Berlin (MESZ, Donnerstag früh)
    const result = nextDepartures(deps, calendar, now);
    expect(result.map((d) => d.time)).toEqual(["25:10:00", "23:50:00"]);
  });

  it("berücksichtigt Feiertage: an einem Feiertag keine Abfahrten, obwohl der Wochentag welche hätte", () => {
    const deps = [dep("14:30:00")];
    // 25.12.2026 (1. Weihnachtsfeiertag) ist ein Freitag, 10 Uhr morgens
    const now = new Date("2026-12-25T09:00:00Z"); // 09:00 UTC = 10:00 Berlin (Winterzeit)
    expect(nextDepartures(deps, calendar, now)).toEqual([]);
  });

  it("begrenzt auf die angegebene Anzahl", () => {
    const deps = Array.from({ length: 10 }, (_, i) => dep(`${10 + i}:00:00`));
    const now = new Date("2026-08-05T06:00:00Z"); // Mittwoch, früh morgens Berlin
    expect(nextDepartures(deps, calendar, now, 3)).toHaveLength(3);
  });
});
