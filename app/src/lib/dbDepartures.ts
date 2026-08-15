// Fetch-Client für den db-proxy-Service (siehe db-proxy/, offizielle DB-Timetables-API im
// Hintergrund) - liefert Zugabfahrten NUR für Deggendorf Hbf (einzige unterstützte Station,
// siehe StopBoard.tsx). Gleiches Fehlerverhalten wie useSchedule.ts's fetchJson, aber vom
// Aufrufer bewusst still behandelt (Zugdaten sind eine optionale Ergänzung, siehe
// StopBoard.tsx - dürfen die Bus-Abfahrtstafel nie brechen).
export interface TrainDeparture {
  tripId: string;
  line: string;
  destination: string;
  plannedTime: string;
  actualTime: string;
  delayMin: number;
  cancelled: boolean;
  platform?: string;
}

// Läuft hinter dem gleichen Reverse Proxy wie die App selbst (siehe README, externe
// VPS-nginx-Config muss /api/db/ auf db-proxy weiterleiten) - relativer Pfad reicht daher,
// auch im Capacitor-Build (dort zeigt useSchedule.ts's Hintergrund-Refresh-Mechanismus auf
// dieselbe Live-Domain, aber die Zugabfahrten sind ohnehin nur online sinnvoll abrufbar -
// kein Offline-Fallback nötig, einfach Fehler still ignorieren wie unten vorgesehen).
export async function fetchTrainDepartures(): Promise<TrainDeparture[]> {
  const res = await fetch("/api/db/departures");
  if (!res.ok) throw new Error(`db-proxy: HTTP ${res.status}`);
  return res.json() as Promise<TrainDeparture[]>;
}
