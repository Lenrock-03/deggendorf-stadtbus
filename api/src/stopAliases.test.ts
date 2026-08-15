import { describe, expect, it } from "vitest";
import { stopMatchesQuery } from "./stopAliases";

describe("stopMatchesQuery", () => {
  it("matcht den normalen Haltestellennamen (Teilstring, case-insensitive)", () => {
    expect(stopMatchesQuery("Deggendorf, Klinikum", "klini")).toBe(true);
    expect(stopMatchesQuery("Deggendorf, Klinikum", "busbahnhof")).toBe(false);
  });

  it("matcht THD/TH Deggendorf/DIT für 'Technische Hochschule'-Haltestellen", () => {
    for (const q of ["thd", "th deggendorf", "dit", "deggendorf institute of technology", "institute"]) {
      expect(stopMatchesQuery("Deggendorf, Technische Hochschule", q)).toBe(true);
    }
  });

  it("wendet den Alias nicht auf andere Haltestellen an", () => {
    expect(stopMatchesQuery("Deggendorf, Klinikum", "thd")).toBe(false);
  });

  it("liefert true für eine leere Suchanfrage", () => {
    expect(stopMatchesQuery("Deggendorf, Klinikum", "")).toBe(true);
  });
});
