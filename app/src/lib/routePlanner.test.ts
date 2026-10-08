import { describe, expect, it } from "vitest";
import { findJourneys } from "./routePlanner";
import type { ScheduleBundle } from "../types/data";

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

/**
 * Rundstrecken-Linien (wie die echten 4 Stadtbuslinien) bedienen manche Haltestellen
 * zweimal pro Umlauf - dieselbe Fahrt (tripId) hat dann zwei Einträge für denselben
 * Haltestellen-Namen zu unterschiedlichen Zeiten/stopSeq. Bootet man am zweiten Besuch
 * ein (das Ziel liegt dann "hinter" einem, nicht mehr erreichbar), fand der alte Code
 * fälschlich einen "Umstieg" auf eine spätere Fahrt DERSELBEN Linie an einem gemeinsamen
 * Umstiegshalt - obwohl diese spätere Fahrt zur exakt gleichen Zeit am Ziel ankommt wie
 * einfaches Warten auf sie an der Starthaltestelle selbst (siehe Kommentar in
 * routePlanner.ts). Diese Tests stellen sicher, dass so ein Umstieg nie mehr auftaucht.
 */
function loopBundle(): ScheduleBundle {
  return {
    routes: [
      { id: "C", shortName: "C", longName: "Linie C", color: "333333" },
      { id: "D", shortName: "D", longName: "Linie D", color: "444444" },
    ],
    stops: [
      { id: "origin", name: "Origin" },
      { id: "hub", name: "Hub" },
      { id: "dest", name: "Dest" },
      { id: "finish", name: "Finish" },
      { id: "d1", name: "D1" },
    ],
    calendar: { weekday: [1, 2, 3, 4, 5], saturday: [6] },
    meta: { generatedAt: "", source: "manual-pdf", disclaimer: "", attribution: "", lineCount: 2 },
    routeStops: {
      // Rundstrecke: origin -> hub -> dest -> origin (2. Besuch) -> hub (2. Besuch) -> finish
      C: [
        { stopId: "origin", name: "Origin" },
        { stopId: "hub", name: "Hub" },
        { stopId: "dest", name: "Dest" },
        { stopId: "origin", name: "Origin" },
        { stopId: "hub", name: "Hub" },
        { stopId: "finish", name: "Finish" },
      ],
      D: [
        { stopId: "d1", name: "D1" },
        { stopId: "hub", name: "Hub" },
      ],
    },
    departures: {
      origin: [
        { tripId: "C-1", routeId: "C", service: "weekday", time: "08:00:00", stopSeq: 1, headsign: "Finish" },
        { tripId: "C-1", routeId: "C", service: "weekday", time: "08:40:00", stopSeq: 4, headsign: "Finish" },
        { tripId: "C-2", routeId: "C", service: "weekday", time: "09:00:00", stopSeq: 1, headsign: "Finish" },
        { tripId: "C-2", routeId: "C", service: "weekday", time: "09:40:00", stopSeq: 4, headsign: "Finish" },
      ],
      hub: [
        { tripId: "C-1", routeId: "C", service: "weekday", time: "08:05:00", stopSeq: 2, headsign: "Finish" },
        { tripId: "C-1", routeId: "C", service: "weekday", time: "08:45:00", stopSeq: 5, headsign: "Finish" },
        { tripId: "C-2", routeId: "C", service: "weekday", time: "09:05:00", stopSeq: 2, headsign: "Finish" },
        { tripId: "C-2", routeId: "C", service: "weekday", time: "09:45:00", stopSeq: 5, headsign: "Finish" },
        { tripId: "D-1", routeId: "D", service: "weekday", time: "08:20:00", stopSeq: 2, headsign: "Hub" },
      ],
      dest: [
        { tripId: "C-1", routeId: "C", service: "weekday", time: "08:10:00", stopSeq: 3, headsign: "Finish" },
        { tripId: "C-2", routeId: "C", service: "weekday", time: "09:10:00", stopSeq: 3, headsign: "Finish" },
      ],
      finish: [
        { tripId: "C-1", routeId: "C", service: "weekday", time: "08:50:00", stopSeq: 6, headsign: "Finish" },
        { tripId: "C-2", routeId: "C", service: "weekday", time: "09:50:00", stopSeq: 6, headsign: "Finish" },
      ],
      d1: [{ tripId: "D-1", routeId: "D", service: "weekday", time: "08:15:00", stopSeq: 1, headsign: "Hub" }],
    },
  };
}

describe("findJourneys - keine Umstiege auf dieselbe Linie", () => {
  it("bietet am zweiten Besuch einer Haltestelle keinen Umstieg auf eine spätere Fahrt derselben Linie an", () => {
    // Kurz nach dem ersten Direkt-Treffer (08:00->08:10): die einzige verbleibende
    // Origin-Abfahrt vor der nächsten echten Runde ist der zweite Besuch um 08:40, von dem
    // aus "dest" auf dieser Fahrt nicht mehr erreichbar ist.
    const result = findJourneys(loopBundle(), "origin", "dest", TUESDAY, 8 * 60 + 11);
    // Vorher hätte das hier fälschlich eine Umstiegsverbindung 08:40 -> (Hub) -> 09:10
    // über Linie C selbst geliefert. Jetzt bleibt nur die echte Direktverbindung der
    // nächsten Runde (09:00 -> 09:10) übrig - exakt dieselbe Ankunftszeit, ohne Umweg.
    expect(result).toHaveLength(1);
    expect(result[0].legs).toHaveLength(1);
    expect(result[0].departureTime).toBe("09:00:00");
    expect(result[0].arrivalTime).toBe("09:10:00");
  });

  it("findet weiterhin echte Umstiege auf eine andere Linie an derselben Haltestelle", () => {
    const result = findJourneys(loopBundle(), "d1", "finish", TUESDAY, 0);
    expect(result).toHaveLength(1);
    expect(result[0].legs).toHaveLength(2);
    expect(result[0].legs[0].routeId).toBe("D");
    expect(result[0].legs[1].routeId).toBe("C");
  });
});
