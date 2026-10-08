/** Minimaler GTFS/RFC4180-CSV-Writer - Haltestellen-/Linien-Namen enthalten Kommas (z.B.
 * "Deggendorf, Klinikum") und teils Anführungszeichen, ein naives join(",") würde die
 * Dateien korrumpieren. Keine externe Library nötig, bleibt im zero-dependency-Stil der
 * Pipeline (abgesehen von jszip fürs Packen, siehe gtfsExport.ts). */

export function csvField(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function csvRow(values: (string | number | boolean | undefined | null)[]): string {
  return values.map(csvField).join(",");
}

export function buildCsv(headers: string[], rows: (string | number | boolean | undefined | null)[][]): string {
  return [csvRow(headers), ...rows.map(csvRow)].join("\r\n") + "\r\n";
}
