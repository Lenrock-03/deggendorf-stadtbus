import { describe, expect, it } from "vitest";
import { toJourneys } from "./motisTranslate";
import type { MotisLeg, MotisPlanResponse } from "./motisClient";

function walkLeg(fromName: string, toName: string, startTime: string, endTime: string, distance: number): MotisLeg {
  return {
    mode: "WALK",
    from: { name: fromName, lat: 48.8, lon: 12.9 },
    to: { name: toName, lat: 48.8, lon: 12.9 },
    startTime,
    endTime,
    distance,
  };
}

// Motis-IDs/tripIds wie live gegen eine echte Motis-Instanz beobachtet (siehe Kommentare in
// motisTranslate.ts): "gtfs_"-Präfix auf routeId/stopId, tripId als
// "YYYYMMDD_HH:MM_gtfs_<unsere-trip-id>".
function busLeg(opts: {
  routeId: string;
  routeShortName: string;
  routeColor: string;
  tripId: string;
  headsign: string;
  fromStopId: string;
  fromName: string;
  startTime: string;
  toStopId: string;
  toName: string;
  endTime: string;
}): MotisLeg {
  return {
    mode: "BUS",
    routeId: `gtfs_${opts.routeId}`,
    routeShortName: opts.routeShortName,
    routeColor: opts.routeColor,
    tripId: `20261008_08:49_gtfs_${opts.tripId}`,
    headsign: opts.headsign,
    from: { name: opts.fromName, stopId: `gtfs_${opts.fromStopId}`, lat: 48.8, lon: 12.9 },
    to: { name: opts.toName, stopId: `gtfs_${opts.toStopId}`, lat: 48.8, lon: 12.9 },
    startTime: opts.startTime,
    endTime: opts.endTime,
  };
}

describe("toJourneys", () => {
  it("übersetzt eine Direktverbindung (ein Transit-Leg), entfernt das gtfs_-Präfix", () => {
    const plan: MotisPlanResponse = {
      itineraries: [
        {
          duration: 60,
          startTime: "2026-10-08T08:49:00+02:00",
          endTime: "2026-10-08T08:50:00+02:00",
          transfers: 0,
          legs: [
            busLeg({
              routeId: "4",
              routeShortName: "4",
              routeColor: "1275d9",
              tripId: "4-mo-fr-1",
              headsign: "Deggendorf, Klinikum",
              fromStopId: "deggendorf-oberer-stadtplatz-west",
              fromName: "Deggendorf, Oberer Stadtplatz West",
              startTime: "2026-10-08T08:49:00+02:00",
              toStopId: "deggendorf-klinikum",
              toName: "Deggendorf, Klinikum",
              endTime: "2026-10-08T08:50:00+02:00",
            }),
          ],
        },
      ],
    };
    const result = toJourneys(plan, 8);
    expect(result).toHaveLength(1);
    expect(result[0].legs).toHaveLength(1);
    expect(result[0].legs[0].routeId).toBe("4");
    expect(result[0].legs[0].tripId).toBe("4-mo-fr-1");
    expect(result[0].legs[0].boardStopId).toBe("deggendorf-oberer-stadtplatz-west");
    expect(result[0].legs[0].alightStopId).toBe("deggendorf-klinikum");
    expect(result[0].legs[0].boardTime).toBe("08:49:00");
    expect(result[0].legs[0].alightTime).toBe("08:50:00");
    expect(result[0].departureTime).toBe("08:49:00");
    expect(result[0].arrivalTime).toBe("08:50:00");
    expect(result[0].transferWaitMin).toBeUndefined();
  });

  it("filtert WALK-Etappen heraus und berechnet transferWaitMin zwischen zwei Transit-Etappen", () => {
    const plan: MotisPlanResponse = {
      itineraries: [
        {
          duration: 1200,
          startTime: "2026-10-08T07:00:00+02:00",
          endTime: "2026-10-08T07:25:00+02:00",
          transfers: 1,
          legs: [
            busLeg({
              routeId: "1",
              routeShortName: "1",
              routeColor: "66c610",
              tripId: "1-mo-fr-1",
              headsign: "Deggendorf Hbf",
              fromStopId: "a",
              fromName: "A",
              startTime: "2026-10-08T07:00:00+02:00",
              toStopId: "hub",
              toName: "Hub",
              endTime: "2026-10-08T07:10:00+02:00",
            }),
            walkLeg("Hub", "Hub", "2026-10-08T07:10:00+02:00", "2026-10-08T07:11:00+02:00", 20),
            busLeg({
              routeId: "2",
              routeShortName: "2",
              routeColor: "fafa2e",
              tripId: "2-mo-fr-3",
              headsign: "Hirzau",
              fromStopId: "hub",
              fromName: "Hub",
              startTime: "2026-10-08T07:15:00+02:00",
              toStopId: "b",
              toName: "B",
              endTime: "2026-10-08T07:25:00+02:00",
            }),
          ],
        },
      ],
    };
    const result = toJourneys(plan, 8);
    expect(result).toHaveLength(1);
    expect(result[0].legs).toHaveLength(2);
    expect(result[0].legs[0].routeId).toBe("1");
    expect(result[0].legs[1].routeId).toBe("2");
    // 07:15 Abfahrt Bus 2 - 07:10 Ankunft Bus 1 = 5 Minuten (der WALK-Leg dazwischen zählt nicht mit)
    expect(result[0].transferWaitMin).toBe(5);
  });

  it("lässt eine Itinerary ohne jeden Transit-Leg weg (reine Fußverbindung)", () => {
    const plan: MotisPlanResponse = {
      itineraries: [
        {
          duration: 300,
          startTime: "2026-10-08T07:00:00+02:00",
          endTime: "2026-10-08T07:05:00+02:00",
          transfers: 0,
          legs: [walkLeg("A", "B", "2026-10-08T07:00:00+02:00", "2026-10-08T07:05:00+02:00", 400)],
        },
      ],
    };
    expect(toJourneys(plan, 8)).toEqual([]);
  });

  it("behält einen vernachlässigbaren Rand-Fußweg (z.B. zwei Bahnsteige derselben Haltestelle, 0m)", () => {
    // Live beobachtet: "Oberer Stadtplatz West"/"Ost" haben identische Koordinaten (0m) -
    // Motis verbindet sie per Fußweg, das darf die Verbindung nicht verwerfen.
    const plan: MotisPlanResponse = {
      itineraries: [
        {
          duration: 60,
          startTime: "2026-10-08T07:15:00+02:00",
          endTime: "2026-10-08T07:26:00+02:00",
          transfers: 0,
          legs: [
            walkLeg("Oberer Stadtplatz West", "Oberer Stadtplatz Ost", "2026-10-08T07:14:30+02:00", "2026-10-08T07:15:00+02:00", 0),
            busLeg({
              routeId: "1",
              routeShortName: "1",
              routeColor: "66c610",
              tripId: "1-mo-fr-3",
              headsign: "Deggendorf, Dr.-Kollmann-Str.",
              fromStopId: "deggendorf-oberer-stadtplatz-ost",
              fromName: "Deggendorf, Oberer Stadtplatz Ost",
              startTime: "2026-10-08T07:15:00+02:00",
              toStopId: "deggendorf-klinikum",
              toName: "Deggendorf, Klinikum",
              endTime: "2026-10-08T07:26:00+02:00",
            }),
          ],
        },
      ],
    };
    const result = toJourneys(plan, 8);
    expect(result).toHaveLength(1);
    expect(result[0].legs).toHaveLength(1);
    expect(result[0].legs[0].boardStopId).toBe("deggendorf-oberer-stadtplatz-ost");
  });

  it("verwirft eine Itinerary mit einem echten (>100m) Rand-Fußweg am Ziel (Bus bis X, dann lange zu Fuß weiter)", () => {
    const plan: MotisPlanResponse = {
      itineraries: [
        {
          duration: 1178,
          startTime: "2026-10-08T06:49:00Z",
          endTime: "2026-10-08T07:20:00Z",
          transfers: 0,
          legs: [
            busLeg({
              routeId: "4",
              routeShortName: "4",
              routeColor: "1275d9",
              tripId: "4-mo-fr-1",
              headsign: "Deggendorf, Oberer Stadtplatz West",
              fromStopId: "deggendorf-oberer-stadtplatz-west",
              fromName: "Deggendorf, Oberer Stadtplatz West",
              startTime: "2026-10-08T06:49:00Z",
              toStopId: "deggendorf-waldschmidtweg",
              toName: "Deggendorf, Waldschmidtweg",
              endTime: "2026-10-08T07:07:00Z",
            }),
            walkLeg("Deggendorf, Waldschmidtweg", "Deggendorf, Klinikum", "2026-10-08T07:07:00Z", "2026-10-08T07:20:00Z", 1000),
          ],
        },
      ],
    };
    expect(toJourneys(plan, 8)).toEqual([]);
  });

  it("verwirft eine Itinerary mit einem echten (>100m) Rand-Fußweg am Start", () => {
    const plan: MotisPlanResponse = {
      itineraries: [
        {
          duration: 600,
          startTime: "2026-10-08T06:49:00Z",
          endTime: "2026-10-08T07:05:00Z",
          transfers: 0,
          legs: [
            walkLeg("A", "C", "2026-10-08T06:49:00Z", "2026-10-08T06:55:00Z", 500),
            busLeg({
              routeId: "4",
              routeShortName: "4",
              routeColor: "1275d9",
              tripId: "4-mo-fr-1",
              headsign: "X",
              fromStopId: "c",
              fromName: "C",
              startTime: "2026-10-08T06:55:00Z",
              toStopId: "b",
              toName: "B",
              endTime: "2026-10-08T07:05:00Z",
            }),
          ],
        },
      ],
    };
    expect(toJourneys(plan, 8)).toEqual([]);
  });

  it("begrenzt auf maxResults", () => {
    const itinerary = {
      duration: 60,
      startTime: "2026-10-08T08:00:00+02:00",
      endTime: "2026-10-08T08:01:00+02:00",
      transfers: 0,
      legs: [
        busLeg({
          routeId: "4",
          routeShortName: "4",
          routeColor: "1275d9",
          tripId: "4-mo-fr-1",
          headsign: "X",
          fromStopId: "a",
          fromName: "A",
          startTime: "2026-10-08T08:00:00+02:00",
          toStopId: "b",
          toName: "B",
          endTime: "2026-10-08T08:01:00+02:00",
        }),
      ],
    };
    const plan: MotisPlanResponse = { itineraries: [itinerary, itinerary, itinerary] };
    expect(toJourneys(plan, 2)).toHaveLength(2);
  });
});
