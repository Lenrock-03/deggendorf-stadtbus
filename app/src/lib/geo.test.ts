import { describe, expect, it } from "vitest";
import { distanceMeters, nearestStops, formatDistance } from "./geo";

describe("distanceMeters", () => {
  it("liefert 0 für identische Koordinaten", () => {
    expect(distanceMeters(48.83, 12.95, 48.83, 12.95)).toBe(0);
  });

  it("liegt nahe an der bekannten Näherung 1° Breite ≈ 111.32 km", () => {
    const d = distanceMeters(48.0, 12.95, 49.0, 12.95);
    expect(d).toBeGreaterThan(111000);
    expect(d).toBeLessThan(111700);
  });
});

describe("nearestStops", () => {
  const stops = [
    { id: "a", name: "A", lat: 48.83, lon: 12.95 },
    { id: "b", name: "B", lat: 48.84, lon: 12.96 },
    { id: "c", name: "C" }, // keine Koordinaten -> muss übersprungen werden
    { id: "d", name: "D", lat: 48.831, lon: 12.951 },
  ];

  it("sortiert nach Entfernung und überspringt Haltestellen ohne Koordinaten", () => {
    const result = nearestStops(stops, 48.83, 12.95, 10);
    expect(result.map((s) => s.id)).toEqual(["a", "d", "b"]);
    expect(result.find((s) => s.id === "c")).toBeUndefined();
  });

  it("begrenzt auf die angegebene Anzahl", () => {
    expect(nearestStops(stops, 48.83, 12.95, 2)).toHaveLength(2);
  });
});

describe("formatDistance", () => {
  it("rundet Meter auf 10er", () => {
    expect(formatDistance(234)).toBe("230 m");
  });
  it("zeigt km ab 1000m mit einer Nachkommastelle", () => {
    expect(formatDistance(1500)).toBe("1.5 km");
  });
});
