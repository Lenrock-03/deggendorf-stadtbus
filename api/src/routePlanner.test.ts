import { describe, expect, it } from "vitest";
import { findJourneys } from "./routePlanner";
import type { ScheduleBundle } from "./types.js";

function bundle(): ScheduleBundle {
  return {
    routes: [
      { id: "A", shortName: "A", longName: "Linie A", color: "111111" },
      { id: "B", shortName: "B", longName: "Linie B", color: "222222" },
    ],
    stops: [
      { id: "a1", name: "A1" },
      { id: "hub", name: "Hub" },
      { id: "a2", name: "A2" },
      { id: "b1", name: "B1" },
      { id: "b2", name: "B2" },
    ],
    calendar: { weekday: [1, 2, 3, 4, 5], saturday: [6] },
    meta: { generatedAt: "", source: "manual-pdf", disclaimer: "", attribution: "", lineCount: 2 },
    routeStops: {
      A: [
        { stopId: "a1", name: "A1" },
        { stopId: "hub", name: "Hub" },
        { stopId: "a2", name: "A2" },
      ],
      B: [
        { stopId: "b1", name: "B1" },
        { stopId: "hub", name: "Hub" },
        { stopId: "b2", name: "B2" },
      ],
    },
    departures: {
      a1: [{ tripId: "A-1", routeId: "A", service: "weekday", time: "08:00:00", stopSeq: 1, headsign: "A2" }],
      hub: [
        { tripId: "A-1", routeId: "A", service: "weekday", time: "08:10:00", stopSeq: 2, headsign: "A2" },
        { tripId: "B-1", routeId: "B", service: "weekday", time: "08:15:00", stopSeq: 2, headsign: "B2" },
      ],
      a2: [{ tripId: "A-1", routeId: "A", service: "weekday", time: "08:20:00", stopSeq: 3, headsign: "A2" }],
      b1: [{ tripId: "B-1", routeId: "B", service: "weekday", time: "08:05:00", stopSeq: 1, headsign: "B2" }],
      b2: [{ tripId: "B-1", routeId: "B", service: "weekday", time: "08:25:00", stopSeq: 3, headsign: "B2" }],
    },
  };
}

const TUESDAY = new Date(2026, 2, 10); // kein Feiertag, kein Wochenende

describe("findJourneys", () => {
  it("findet eine Direktverbindung auf derselben Linie", () => {
    const result = findJourneys(bundle(), "a1", "a2", TUESDAY, 0);
    expect(result).toHaveLength(1);
    expect(result[0].legs).toHaveLength(1);
    expect(result[0].legs[0].routeId).toBe("A");
    expect(result[0].departureTime).toBe("08:00:00");
    expect(result[0].arrivalTime).toBe("08:20:00");
  });

  it("findet eine Umsteigeverbindung über eine gemeinsame Haltestelle", () => {
    const result = findJourneys(bundle(), "a1", "b2", TUESDAY, 0);
    expect(result).toHaveLength(1);
    const j = result[0];
    expect(j.legs).toHaveLength(2);
    expect(j.legs[0].routeId).toBe("A");
    expect(j.legs[0].alightStopId).toBe("hub");
    expect(j.legs[1].routeId).toBe("B");
    expect(j.legs[1].boardStopId).toBe("hub");
    expect(j.departureTime).toBe("08:00:00");
    expect(j.arrivalTime).toBe("08:25:00");
    expect(j.transferWaitMin).toBe(5); // 08:15 - 08:10
  });

  it("liefert nichts, wenn kein Weg existiert (Endhaltestelle ohne Anschluss)", () => {
    expect(findJourneys(bundle(), "a2", "b1", TUESDAY, 0)).toEqual([]);
  });

  it("liefert nichts für Start = Ziel", () => {
    expect(findJourneys(bundle(), "a1", "a1", TUESDAY, 0)).toEqual([]);
  });

  it("liefert nichts an einem Tag ohne Verkehr (Feiertag)", () => {
    const christmas = new Date(2026, 11, 25);
    expect(findJourneys(bundle(), "a1", "a2", christmas, 0)).toEqual([]);
  });

  it("berücksichtigt afterMin (nur Abfahrten ab diesem Zeitpunkt)", () => {
    expect(findJourneys(bundle(), "a1", "a2", TUESDAY, 8 * 60 + 1)).toEqual([]); // nach 08:01, Abfahrt war 08:00
    expect(findJourneys(bundle(), "a1", "a2", TUESDAY, 8 * 60)).toHaveLength(1); // ab 08:00 genau noch dabei
  });
});
