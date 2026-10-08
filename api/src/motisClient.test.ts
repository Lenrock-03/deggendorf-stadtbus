import { describe, expect, it } from "vitest";
import { berlinOffset, toRfc3339Berlin } from "./motisClient";

describe("berlinOffset", () => {
  it("liefert +01:00 im Winter (MEZ)", () => {
    expect(berlinOffset(2026, 1, 15)).toBe("+01:00");
  });
  it("liefert +02:00 im Sommer (MESZ)", () => {
    expect(berlinOffset(2026, 7, 15)).toBe("+02:00");
  });
  it("liegt nach der Umstellung Ende März bereits auf MESZ", () => {
    expect(berlinOffset(2026, 3, 29)).toBe("+02:00"); // Umstellungstag 2026 selbst
    expect(berlinOffset(2026, 3, 30)).toBe("+02:00");
  });
  it("liegt vor der Umstellung Ende März noch auf MEZ", () => {
    expect(berlinOffset(2026, 3, 28)).toBe("+01:00");
  });
  it("liegt nach der Umstellung Ende Oktober bereits auf MEZ", () => {
    expect(berlinOffset(2026, 10, 25)).toBe("+01:00"); // Umstellungstag 2026 selbst
    expect(berlinOffset(2026, 10, 26)).toBe("+01:00");
  });
  it("liegt vor der Umstellung Ende Oktober noch auf MESZ", () => {
    expect(berlinOffset(2026, 10, 24)).toBe("+02:00");
  });
});

describe("toRfc3339Berlin", () => {
  it("baut einen korrekten Zeitstempel im Winter", () => {
    const date = new Date("2026-01-15T00:00:00.000Z"); // UTC-Mitternacht, wie parseDateQuery liefert
    expect(toRfc3339Berlin(date, 8 * 60 + 49)).toBe("2026-01-15T08:49:00+01:00");
  });
  it("baut einen korrekten Zeitstempel im Sommer", () => {
    const date = new Date("2026-07-15T00:00:00.000Z");
    expect(toRfc3339Berlin(date, 8 * 60 + 49)).toBe("2026-07-15T08:49:00+02:00");
  });
});
