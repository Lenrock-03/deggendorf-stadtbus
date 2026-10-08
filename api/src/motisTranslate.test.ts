import { describe, expect, it } from "vitest";
import { toJourneys } from "./motisTranslate";
import type { MotisLeg, MotisPlanResponse } from "./motisClient";

function walkLeg(startTime: string, endTime: string): MotisLeg {
  return {
    mode: "WALK",
    from: { name: "Fuß-Start", lat: 48.8, lon: 12.9 },
    to: { name: "Fuß-Ziel", lat: 48.8, lon: 12.9 },
    startTime,
    endTime,
  };
}

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
    routeId: opts.routeId,
    routeShortName: opts.routeShortName,
    routeColor: opts.routeColor,
    tripId: opts.tripId,
    headsign: opts.headsign,
    from: { name: opts.fromName, stopId: opts.fromStopId, lat: 48.8, lon: 12.9 },
    to: { name: opts.toName, stopId: opts.toStopId, lat: 48.8, lon: 12.9 },
    startTime: opts.startTime,
    endTime: opts.endTime,
  };
}

describe("toJourneys", () => {
  it("übersetzt eine Direktverbindung (ein Transit-Leg)", () => {
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
            walkLeg("2026-10-08T07:10:00+02:00", "2026-10-08T07:11:00+02:00"),
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
          legs: [walkLeg("2026-10-08T07:00:00+02:00", "2026-10-08T07:05:00+02:00")],
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
