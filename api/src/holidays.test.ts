import { describe, expect, it } from "vitest";
import { bavarianPublicHolidays, easterSunday, isPublicHoliday, isSchoolDay, isSchoolHoliday } from "./holidays";

describe("easterSunday", () => {
  it("berechnet bekannte Ostersonntage korrekt", () => {
    expect(easterSunday(2024)).toEqual(new Date(2024, 2, 31));
    expect(easterSunday(2025)).toEqual(new Date(2025, 3, 20));
    expect(easterSunday(2026)).toEqual(new Date(2026, 3, 5));
    expect(easterSunday(2027)).toEqual(new Date(2027, 2, 28));
  });
});

describe("bavarianPublicHolidays / isPublicHoliday", () => {
  it("enthält alle 13 bayerischen Feiertage für 2026", () => {
    expect(bavarianPublicHolidays(2026)).toHaveLength(13);
  });

  it("erkennt feste Feiertage", () => {
    expect(isPublicHoliday(new Date(2026, 0, 1))).toBe(true); // Neujahr
    expect(isPublicHoliday(new Date(2026, 11, 25))).toBe(true); // 1. Weihnachtsfeiertag
    expect(isPublicHoliday(new Date(2026, 7, 15))).toBe(true); // Mariä Himmelfahrt
  });

  it("erkennt bewegliche Feiertage relativ zu Ostern 2026 (05.04.)", () => {
    expect(isPublicHoliday(new Date(2026, 3, 3))).toBe(true); // Karfreitag
    expect(isPublicHoliday(new Date(2026, 3, 6))).toBe(true); // Ostermontag
    expect(isPublicHoliday(new Date(2026, 4, 14))).toBe(true); // Christi Himmelfahrt (+39)
    expect(isPublicHoliday(new Date(2026, 4, 25))).toBe(true); // Pfingstmontag (+50)
    expect(isPublicHoliday(new Date(2026, 5, 4))).toBe(true); // Fronleichnam (+60)
  });

  it("liefert false für einen normalen Werktag", () => {
    expect(isPublicHoliday(new Date(2026, 2, 10))).toBe(false);
  });
});

describe("isSchoolHoliday", () => {
  it("erkennt die Sommerferien 2026", () => {
    expect(isSchoolHoliday(new Date(2026, 7, 6))).toBe(true); // 06.08.2026, mitten drin
    expect(isSchoolHoliday(new Date(2026, 7, 3))).toBe(true); // erster Tag
    expect(isSchoolHoliday(new Date(2026, 8, 14))).toBe(true); // letzter Tag
    expect(isSchoolHoliday(new Date(2026, 8, 15))).toBe(false); // Tag danach
  });

  it("erkennt Weihnachtsferien über den Jahreswechsel", () => {
    expect(isSchoolHoliday(new Date(2026, 11, 30))).toBe(true);
    expect(isSchoolHoliday(new Date(2027, 0, 5))).toBe(true);
    expect(isSchoolHoliday(new Date(2027, 0, 9))).toBe(false);
  });
});

describe("isSchoolDay", () => {
  it("ist false am Wochenende", () => {
    expect(isSchoolDay(new Date(2026, 2, 7))).toBe(false); // Samstag
  });
  it("ist false an einem Feiertag, der auf einen Werktag fällt", () => {
    expect(isSchoolDay(new Date(2026, 4, 25))).toBe(false); // Pfingstmontag 2026, Montag
  });
  it("ist false in den Sommerferien", () => {
    expect(isSchoolDay(new Date(2026, 7, 10))).toBe(false);
  });
  it("ist true an einem normalen Schultag", () => {
    expect(isSchoolDay(new Date(2026, 2, 10))).toBe(true); // Dienstag, außerhalb Ferien
  });
});
