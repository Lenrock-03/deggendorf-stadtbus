#!/usr/bin/env python3
"""Wandelt linie-N.parsed.json (aus parse_line.py) in das fallback-data/lines/*.json Schema um."""
import json
import re
import sys

# Farben aus den offiziellen Fahrplan-PDFs übernommen (dort ist jede Linie durchgehend in
# einer eigenen Zeilenfarbe hervorgehoben: Linie 1 grün, Linie 2 gelb, Linie 3 lachs/rot,
# Linie 4 blau - per Pixelanalyse der Original-PDFs bestimmt). Für die App-UI (weiße/
# schwarze Badge-Schrift) auf dieselbe Farbfamilie mit besserem Kontrast angepasst statt
# der sehr blassen Roh-Tabellenfarben 1:1 zu übernehmen.
META = {
    "1": {
        "shortName": "1",
        "longName": "Himmelreich - Stammstrecke - Scheuering und zurück",
        "color": "66c610",
        "validFrom": "2025-01-01",
    },
    "3": {
        "shortName": "3",
        "longName": "Aletsberg - Stammstrecke - Mietraching und zurück",
        "color": "e61919",
        "validFrom": "2025-01-01",
    },
    "2": {
        "shortName": "2",
        "longName": "Hirzau - Stammstrecke - Rörerstraße und zurück",
        "color": "fafa2e",
        "validFrom": "2025-01-01",
    },
    # Linie 4 wird nicht über dieses Skript erzeugt (siehe fallback-data/lines/linie-4.json),
    # Farbe dort direkt gepflegt: "1275d9".
}

# 0-basierte Werktagsspalten-Indizes, die laut Fahrplan nur an Schultagen fahren ("S" im
# Fahrplan, exakt an dieser Spaltenposition bestätigt - siehe SPIKE_FINDINGS.md).
SCHOOLDAY_TRIP_INDICES = {"2": [7, 8]}

NOTES = "Gültig an Werktagen. An Sonn- und Feiertagen kein Verkehr. An Heiligabend und Silvester Verkehr wie am Samstag, außer wenn der 24.12./31.12. auf einen Sonntag fällt (dann kein Verkehr)."
NOTES_LINE2_SUFFIX = (
    " Einzelne Haltestellen sind bei bestimmten Fahrten laut Fahrplan \"nur Bedarf zum"
    " Aussteigen\" (AB) - wird in der App entsprechend markiert."
)

CELL_RE = re.compile(r"^(\d{2}:\d{2})(\*S|AB)?$")

# Manche Linien-PDFs hängen die Bussteignummer an "Deggendorf Hbf" an (z.B. "... Hbf 10"),
# andere nicht - physisch ist es dieselbe Haltestelle (Hauptbahnhof), daher hier auf einen
# einheitlichen Namen normalisiert, damit die Pipeline sie zu einer Haltestelle zusammenführt.
HBF_PLATFORM_RE = re.compile(r"^(Deggendorf Hbf) \d+$")


def normalize_stop_name(name):
    m = HBF_PLATFORM_RE.match(name)
    return m.group(1) if m else name


def split_cell(raw):
    """('13:10AB', ...) -> ('13:10', True); ('07:29', ...) -> ('07:29', False)."""
    if raw is None:
        return None, False
    m = CELL_RE.match(raw)
    if not m:
        return raw[:5], False
    return m.group(1), m.group(2) == "AB"


def dedupe_near_duplicate_trips(trips, threshold=0.85):
    """Entfernt Fahrten, die durch das x-Positions-Spaltenclustering im PDF-Parser als
    Phantom-Duplikate einer bereits erkannten Fahrt entstanden sind (z.B. Linie 2: durch
    die AB-Suffix-Textbreite leicht verschobene Werte wurden fälschlich einer eigenen
    Spalte statt der echten zugeordnet, siehe Investigation zu den Spaltenpaaren 0/15 und
    1/16). Erkennung: sehr hohe Übereinstimmung der an beiden Fahrten nicht-leeren Werte.
    Behält die zuerst gefundene Fahrt und ergänzt sie um Werte, die nur die Duplikat-Fahrt
    hatte (z.B. durch fehlende Zellen auf der einen oder anderen Seite)."""
    kept = []
    for t in trips:
        dup_of = None
        for k in kept:
            matches = 0
            compared = 0
            for a, b in zip(k["times"], t["times"]):
                if a is not None and b is not None:
                    compared += 1
                    if a == b:
                        matches += 1
            if compared >= 5 and matches / compared >= threshold:
                dup_of = k
                break
        if dup_of is not None:
            for idx, (a, b) in enumerate(zip(dup_of["times"], t["times"])):
                if a is None and b is not None:
                    dup_of["times"][idx] = b
            if dup_of.get("start") is None and t.get("start") is not None:
                dup_of["start"] = t["start"]
            continue
        kept.append(t)
    return kept


def main():
    line_id = sys.argv[1]
    parsed_path = sys.argv[2]
    n_weekday = int(sys.argv[3])

    with open(parsed_path, encoding="utf-8") as f:
        parsed = json.load(f)

    stops = parsed["stops"]
    meta = META[line_id]
    schoolday_indices = set(SCHOOLDAY_TRIP_INDICES.get(line_id, []))

    stops_out = []
    for s in stops:
        note = s["note"]
        name = normalize_stop_name(s["name"])
        stops_out.append({"seq": len(stops_out) + 1, "name": name, **({"note": note} if note else {})})

    weekday_trips = []
    for i, raw_start in enumerate(parsed["weekdayStartTimes"]):
        start, _ = split_cell(raw_start)
        cells = [split_cell(s["times"][i]) for s in stops]
        times = [c[0] for c in cells]
        drop_off = [c[1] for c in cells]
        service = "schoolday" if i in schoolday_indices else "weekday"
        trip = {"service": service, "start": start, "times": times}
        if any(drop_off):
            trip["dropOffOnly"] = drop_off
        weekday_trips.append(trip)

    saturday_trips = []
    for i, raw_start in enumerate(parsed["saturdayStartTimes"]):
        col = n_weekday + i
        start, _ = split_cell(raw_start)
        cells = [split_cell(s["times"][col]) for s in stops]
        times = [c[0] for c in cells]
        drop_off = [c[1] for c in cells]
        trip = {"service": "saturday", "start": start, "times": times}
        if any(drop_off):
            trip["dropOffOnly"] = drop_off
        saturday_trips.append(trip)

    n_weekday_before = len(weekday_trips)
    n_saturday_before = len(saturday_trips)
    weekday_trips = dedupe_near_duplicate_trips(weekday_trips)
    saturday_trips = dedupe_near_duplicate_trips(saturday_trips)
    n_removed = (n_weekday_before - len(weekday_trips)) + (n_saturday_before - len(saturday_trips))

    def with_id(trip, trip_id):
        ordered = {"id": trip_id, "service": trip["service"], "start": trip["start"], "times": trip["times"]}
        if "dropOffOnly" in trip:
            ordered["dropOffOnly"] = trip["dropOffOnly"]
        return ordered

    trips = [with_id(t, f"mo-fr-{i + 1}") for i, t in enumerate(weekday_trips)]
    trips += [with_id(t, f"sa-{i + 1}") for i, t in enumerate(saturday_trips)]

    out = {
        "id": line_id,
        "shortName": meta["shortName"],
        "longName": meta["longName"],
        "color": meta["color"],
        "validFrom": meta["validFrom"],
        "source": "manual-pdf",
        "sourceFile": f"source-pdfs/linie-{line_id}.pdf",
        "notes": NOTES + (NOTES_LINE2_SUFFIX if line_id == "2" else ""),
        "stops": stops_out,
        "trips": trips,
    }

    out_path = f"../lines/linie-{line_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    n_schoolday = sum(1 for t in trips if t["service"] == "schoolday")
    n_dropoff = sum(1 for t in trips if "dropOffOnly" in t)
    dedupe_note = f", {n_removed} Phantom-Duplikate entfernt" if n_removed else ""
    print(
        f"-> {out_path}: {len(stops_out)} Haltestellen, {len(trips)} Fahrten "
        f"({n_schoolday} nur Schultage, {n_dropoff} mit Bedarfshalten{dedupe_note})",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
