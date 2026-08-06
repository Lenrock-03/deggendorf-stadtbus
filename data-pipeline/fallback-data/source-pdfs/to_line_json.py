#!/usr/bin/env python3
"""Wandelt linie-N.parsed.json (aus parse_line.py) in das fallback-data/lines/*.json Schema um."""
import json
import re
import sys

META = {
    "1": {
        "shortName": "1",
        "longName": "Himmelreich - Stammstrecke - Scheuering und zurück",
        "color": "0057a3",
        "validFrom": "2025-01-01",
    },
    "3": {
        "shortName": "3",
        "longName": "Aletsberg - Stammstrecke - Mietraching und zurück",
        "color": "6a1b9a",
        "validFrom": "2025-01-01",
    },
    "2": {
        "shortName": "2",
        "longName": "Hirzau - Stammstrecke - Rörerstraße und zurück",
        "color": "2e7d32",
        "validFrom": "2025-01-01",
    },
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

    trips = []
    for i, raw_start in enumerate(parsed["weekdayStartTimes"]):
        start, _ = split_cell(raw_start)
        cells = [split_cell(s["times"][i]) for s in stops]
        times = [c[0] for c in cells]
        drop_off = [c[1] for c in cells]
        service = "schoolday" if i in schoolday_indices else "weekday"
        trip = {"id": f"mo-fr-{i + 1}", "service": service, "start": start, "times": times}
        if any(drop_off):
            trip["dropOffOnly"] = drop_off
        trips.append(trip)

    for i, raw_start in enumerate(parsed["saturdayStartTimes"]):
        col = n_weekday + i
        start, _ = split_cell(raw_start)
        cells = [split_cell(s["times"][col]) for s in stops]
        times = [c[0] for c in cells]
        drop_off = [c[1] for c in cells]
        trip = {"id": f"sa-{i + 1}", "service": "saturday", "start": start, "times": times}
        if any(drop_off):
            trip["dropOffOnly"] = drop_off
        trips.append(trip)

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
    print(
        f"-> {out_path}: {len(stops_out)} Haltestellen, {len(trips)} Fahrten "
        f"({n_schoolday} nur Schultage, {n_dropoff} mit Bedarfshalten)",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
