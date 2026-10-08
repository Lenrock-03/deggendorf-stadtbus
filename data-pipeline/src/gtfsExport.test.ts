import { describe, expect, it } from "vitest";
import { actualActiveServices, fillMissingCoords, readableTextColorHex, weeklyActiveServices } from "./gtfsExport";
import type { StopOut } from "./types";

describe("readableTextColorHex", () => {
  it("wählt schwarz für helles Gelb (Linie 2)", () => {
    expect(readableTextColorHex("fafa2e")).toBe("000000");
  });
  it("wählt weiß für dunkles Blau (Linie 4)", () => {
    expect(readableTextColorHex("1275d9")).toBe("FFFFFF");
  });
});

describe("weeklyActiveServices", () => {
  it("liefert weekday+schoolday an einem Dienstag", () => {
    const result = weeklyActiveServices(new Date(2026, 2, 10)); // Dienstag
    expect([...result].sort()).toEqual(["schoolday", "weekday"]);
  });
  it("liefert nur saturday an einem Samstag", () => {
    expect([...weeklyActiveServices(new Date(2026, 2, 7))]).toEqual(["saturday"]);
  });
  it("liefert nichts an einem Sonntag", () => {
    expect([...weeklyActiveServices(new Date(2026, 2, 8))]).toEqual([]);
  });
});

describe("actualActiveServices (spiegelt app/src/lib/calendar.ts activeServicesForDate)", () => {
  it("entfernt alles an einem gesetzlichen Feiertag mitten in der Woche", () => {
    expect([...actualActiveServices(new Date(2026, 11, 25))]).toEqual([]); // 1. Weihnachtsfeiertag, Freitag
  });
  it("Heiligabend (kein Sonntag) läuft wie Samstag", () => {
    expect([...actualActiveServices(new Date(2026, 11, 24))]).toEqual(["saturday"]); // Donnerstag
  });
  it("Silvester als Sonntag bleibt verkehrsfrei (Sonntagsregel schlägt Heiligabend/Silvester-Regel nicht)", () => {
    // 31.12.2028 fällt auf einen Sonntag
    expect([...actualActiveServices(new Date(2028, 11, 31))]).toEqual([]);
  });
  it("entfernt schoolday (nicht weekday) in den Schulferien an einem normalen Wochentag", () => {
    const result = actualActiveServices(new Date(2026, 7, 10)); // Montag, Sommerferien
    expect([...result]).toEqual(["weekday"]);
  });
  it("lässt alles unverändert an einem normalen Schultag", () => {
    const result = actualActiveServices(new Date(2026, 2, 10)); // Dienstag, außerhalb Ferien
    expect([...result].sort()).toEqual(["schoolday", "weekday"]);
  });
});

describe("fillMissingCoords", () => {
  const seq = [
    { stopId: "a", name: "A" },
    { stopId: "b", name: "B" }, // fehlende Koordinaten, Mitte
    { stopId: "c", name: "C" },
  ];

  it("interpoliert linear zwischen bekannten Nachbarn", () => {
    const stops: StopOut[] = [
      { id: "a", name: "A", lat: 48.0, lon: 12.0 },
      { id: "b", name: "B" },
      { id: "c", name: "C", lat: 49.0, lon: 13.0 },
    ];
    const { stops: result, interpolated } = fillMissingCoords(stops, { "1": seq });
    const b = result.find((s) => s.id === "b")!;
    expect(b.lat).toBeCloseTo(48.5);
    expect(b.lon).toBeCloseTo(12.5);
    expect(interpolated).toHaveLength(1);
  });

  it("übernimmt den einzigen bekannten Nachbarn, wenn nur eine Seite bekannt ist", () => {
    const stops: StopOut[] = [
      { id: "a", name: "A", lat: 48.0, lon: 12.0 },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const { stops: result } = fillMissingCoords(stops, { "1": seq });
    expect(result.find((s) => s.id === "b")?.lat).toBe(48.0);
    expect(result.find((s) => s.id === "c")?.lat).toBe(48.0);
  });

  it("lässt eine Haltestelle ohne jeden bekannten Nachbarn unverändert", () => {
    const stops: StopOut[] = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const { stops: result, interpolated } = fillMissingCoords(stops, { "1": seq });
    expect(result.find((s) => s.id === "a")?.lat).toBeUndefined();
    expect(interpolated).toEqual([]);
  });
});
