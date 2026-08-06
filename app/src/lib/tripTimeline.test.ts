import { describe, expect, it } from "vitest";
import { timelineDurationMin, timelineForTrip, timelineSegment, tripsForRoute } from "./tripTimeline";
import type { ScheduleBundle } from "../types/data";

function bundle(): ScheduleBundle {
  return {
    routes: [{ id: "4", shortName: "4", longName: "Test", color: "e2001a" }],
    stops: [],
    calendar: { weekday: [1, 2, 3, 4, 5], saturday: [6] },
    meta: { generatedAt: "", source: "manual-pdf", disclaimer: "", attribution: "", lineCount: 1 },
    routeStops: {
      "4": [
        { stopId: "a", name: "A" },
        { stopId: "b", name: "B" },
        { stopId: "c", name: "C" },
      ],
    },
    departures: {
      a: [
        { tripId: "4-1", routeId: "4", service: "weekday", time: "08:00:00", stopSeq: 1, headsign: "C" },
        { tripId: "4-2", routeId: "4", service: "weekday", time: "09:00:00", stopSeq: 1, headsign: "B" },
      ],
      b: [
        { tripId: "4-1", routeId: "4", service: "weekday", time: "08:05:00", stopSeq: 2, headsign: "C" },
        // Fahrt 4-2 ist eine Kurzfahrt und bedient B nicht (kein Eintrag hier).
      ],
      c: [{ tripId: "4-1", routeId: "4", service: "weekday", time: "08:10:00", stopSeq: 3, headsign: "C" }],
    },
  };
}

describe("tripsForRoute", () => {
  it("findet alle Fahrten sortiert nach Startzeit", () => {
    const trips = tripsForRoute(bundle(), "4");
    expect(trips.map((t) => t.tripId)).toEqual(["4-1", "4-2"]);
    expect(trips[0].startTime).toBe("08:00:00");
  });
});

describe("timelineForTrip", () => {
  it("liefert den vollständigen Verlauf mit isFirst/isLast", () => {
    const tl = timelineForTrip(bundle(), "4", "4-1");
    expect(tl.map((s) => s.stopId)).toEqual(["a", "b", "c"]);
    expect(tl[0].isFirst).toBe(true);
    expect(tl[2].isLast).toBe(true);
    expect(tl[1].isFirst).toBe(false);
  });

  it("bricht bei Kurzfahrten dort ab, wo die Fahrt tatsächlich endet", () => {
    const tl = timelineForTrip(bundle(), "4", "4-2");
    expect(tl.map((s) => s.stopId)).toEqual(["a"]);
    expect(tl[0].isFirst).toBe(true);
    expect(tl[0].isLast).toBe(true);
  });
});

describe("timelineSegment", () => {
  it("schneidet den Abschnitt zwischen zwei Haltestellen mit neuem isFirst/isLast heraus", () => {
    const seg = timelineSegment(bundle(), "4", "4-1", "a", "08:00:00", "b", "08:05:00");
    expect(seg.map((s) => s.stopId)).toEqual(["a", "b"]);
    expect(seg[0].isFirst).toBe(true);
    expect(seg[1].isLast).toBe(true);
  });

  it("liefert [] wenn Start- oder Endpunkt nicht auf der Fahrt liegt", () => {
    expect(timelineSegment(bundle(), "4", "4-1", "a", "08:00:00", "x", "09:00:00")).toEqual([]);
  });
});

describe("timelineDurationMin", () => {
  it("berechnet die Differenz zwischen erster und letzter Zeit", () => {
    const tl = timelineForTrip(bundle(), "4", "4-1");
    expect(timelineDurationMin(tl)).toBe(10);
  });

  it("liefert 0 bei weniger als 2 Haltestellen", () => {
    expect(timelineDurationMin([])).toBe(0);
  });
});
