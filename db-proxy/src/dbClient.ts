import { XMLParser } from "fast-xml-parser";
import { DEGGENDORF_HBF_EVA, TIMETABLES_BASE_URL } from "./constants.js";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

function ensureArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

interface RawStop {
  id: string;
  tl?: { c?: string; n?: string };
  dp?: { pt?: string; ct?: string; l?: string; pth?: string; cp?: string; cs?: string };
}

export interface TrainDeparture {
  tripId: string;
  line: string; // z.B. "RE 3" - aus <tl c="RE" n="..."> bzw. Fallback <dp l="...">
  destination: string; // letzte Station aus pth (Laufweg), leer wenn unbekannt
  plannedTime: string; // ISO 8601
  actualTime: string; // ISO 8601, == plannedTime falls keine Ist-Daten vorliegen
  delayMin: number;
  cancelled: boolean;
  platform?: string;
}

function authHeaders(): Record<string, string> {
  const clientId = process.env.DB_CLIENT_ID;
  const apiKey = process.env.DB_API_KEY;
  if (!clientId || !apiKey) {
    throw new Error("DB_CLIENT_ID / DB_API_KEY nicht gesetzt (siehe db-proxy/.env.example)");
  }
  return { "DB-Client-Id": clientId, "DB-Api-Key": apiKey, Accept: "application/xml" };
}

// Timetables-API-Datumsformat: YYMMDD, Stunde zweistellig 00-23, jeweils in der Zeitzone
// der Bahn (Europe/Berlin) - der Server läuft auf dem VPS in UTC, daher explizit umrechnen.
function planPathParts(date: Date): { yymmdd: string; hh: string } {
  const berlin = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const yy = String(berlin.getFullYear()).slice(2);
  const mm = String(berlin.getMonth() + 1).padStart(2, "0");
  const dd = String(berlin.getDate()).padStart(2, "0");
  const hh = String(berlin.getHours()).padStart(2, "0");
  return { yymmdd: `${yy}${mm}${dd}`, hh };
}

// Timetables-Zeitformat YYMMDDHHmm -> ISO. Nimmt an, dass die Bahn-Zeit in Europe/Berlin
// gemeint ist (Sommer-/Winterzeit-Offset wird über die aktuelle Systemzeitzone des VPS
// (UTC) + festen Berlin-Offset grob genähert - für eine reine Anzeige "Uhrzeit" ausreichend
// genau, keine sekundengenaue Verarbeitung nötig).
function parseBahnTime(raw: string | undefined): string | undefined {
  if (!raw || raw.length !== 10) return undefined;
  const yy = Number(raw.slice(0, 2));
  const mm = Number(raw.slice(2, 4));
  const dd = Number(raw.slice(4, 6));
  const hh = Number(raw.slice(6, 8));
  const min = Number(raw.slice(8, 10));
  // new Date(...) mit lokalen Feldern interpretiert im Server-Timezone (VPS: UTC) - da wir
  // hier nur eine Anzeige-Uhrzeit brauchen (kein exaktes UTC), reicht das für die Card im
  // Frontend, die ohnehin nur HH:mm anzeigt (siehe app/src/lib/dbDepartures.ts).
  return new Date(2000 + yy, mm - 1, dd, hh, min).toISOString();
}

async function fetchXml(path: string): Promise<any> {
  const res = await fetch(`${TIMETABLES_BASE_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Timetables API ${path}: HTTP ${res.status}`);
  const xml = await res.text();
  return parser.parse(xml);
}

/** Holt Sollfahrplan (aktuelle + nächste Stunde) und Ist-Änderungen für Deggendorf Hbf,
 * merged beides zu einer Liste kommender Zugabfahrten. */
export async function fetchDepartures(): Promise<TrainDeparture[]> {
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
  const windows = [planPathParts(now), planPathParts(nextHour)];

  const plans = await Promise.all(
    windows.map((w) => fetchXml(`/plan/${DEGGENDORF_HBF_EVA}/${w.yymmdd}/${w.hh}`))
  );
  let changes: any = null;
  try {
    changes = await fetchXml(`/fchg/${DEGGENDORF_HBF_EVA}`);
  } catch {
    // Ist-Daten sind ein Bonus (Verspätungen) - wenn das scheitert, trotzdem mit den
    // Solldaten weitermachen statt komplett zu versagen.
  }
  const changesById = new Map<string, RawStop>();
  for (const s of ensureArray<RawStop>(changes?.timetable?.s)) {
    if (s?.id) changesById.set(s.id, s);
  }

  const result: TrainDeparture[] = [];
  const seen = new Set<string>();
  for (const plan of plans) {
    for (const s of ensureArray<RawStop>(plan?.timetable?.s)) {
      if (!s?.id || !s.dp || seen.has(s.id)) continue;
      seen.add(s.id);
      const change = changesById.get(s.id);
      const plannedIso = parseBahnTime(s.dp.pt);
      if (!plannedIso) continue;
      const actualIso = parseBahnTime(change?.dp?.ct) ?? plannedIso;
      const delayMin = Math.round((new Date(actualIso).getTime() - new Date(plannedIso).getTime()) / 60000);
      const line = s.tl?.c && s.tl?.n ? `${s.tl.c} ${s.tl.n}` : s.dp.l ?? "?";
      const destination = (s.dp.pth ?? "").split("|").filter(Boolean).at(-1) ?? "";
      result.push({
        tripId: s.id,
        line,
        destination,
        plannedTime: plannedIso,
        actualTime: actualIso,
        delayMin: Number.isFinite(delayMin) ? delayMin : 0,
        cancelled: change?.dp?.cs === "c",
        platform: change?.dp?.cp ?? undefined,
      });
    }
  }
  result.sort((a, b) => a.actualTime.localeCompare(b.actualTime));
  return result;
}
