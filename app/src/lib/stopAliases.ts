/**
 * Alternative Namen/Abkürzungen, unter denen eine Haltestelle ebenfalls gesucht werden
 * soll, obwohl sie im offiziellen Fahrplan nicht so heißt (z.B. Kurzformen, englische
 * Bezeichnungen). `match` ist ein Teilstring des echten Haltestellennamens (kleingeschrieben),
 * über den die Zuordnung erfolgt - so gilt der Eintrag automatisch für jede Haltestelle,
 * die diesen Text enthält (z.B. beide "Technische Hochschule"-Haltepunkte).
 */
const STOP_ALIASES: { match: string; aliases: string[] }[] = [
  {
    match: "technische hochschule",
    aliases: ["thd", "th deggendorf", "th-deggendorf", "dit", "deggendorf institute of technology"],
  },
];

/** Ob eine Haltestelle auf eine Sucheingabe passt - Name selbst oder eine Alias-Angabe. */
export function stopMatchesQuery(stopName: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = stopName.toLowerCase();
  if (name.includes(q)) return true;
  return STOP_ALIASES.some(({ match, aliases }) => name.includes(match) && aliases.some((a) => a.includes(q)));
}
