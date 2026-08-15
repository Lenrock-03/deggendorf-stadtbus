// EVA-Nummer Deggendorf Hbf, bestätigt gegen DB Station&Service AGs offizielle
// Bahnhofsliste (D_Bahnhof_2020_alle.csv: "8001397;NDG;de:09271:5500;Deggendorf Hbf;...").
// Koordinaten dort (48.83944/12.949727) stimmen mit app/public/data/stops.json's
// "deggendorf-hbf" (48.83850599/12.94974633) übereinigen exakt - gleiche Station.
export const DEGGENDORF_HBF_EVA = "8001397";
export const DEGGENDORF_HBF_STOP_ID = "deggendorf-hbf";

export const TIMETABLES_BASE_URL = "https://apis.deutschebahn.com/db-api-marketplace/apis/timetables/v1";

// In-Memory-Cache-Dauer für Antworten an den Client, passend zum 60-Anfragen/Minute-Limit
// der kostenlosen Timetables-API-Stufe.
export const CACHE_TTL_MS = 60_000;
