#!/usr/bin/env python3
"""Wandelt linie-N.parsed.json (aus parse_line.py) in das fallback-data/lines/*.json Schema um."""
import json
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
}

NOTES = "Gültig an Werktagen. An Sonn- und Feiertagen kein Verkehr. An Heiligabend und Silvester Verkehr wie am Samstag, außer wenn der 24.12./31.12. auf einen Sonntag fällt (dann kein Verkehr)."


def main():
    line_id = sys.argv[1]
    parsed_path = sys.argv[2]
    n_weekday = int(sys.argv[3])

    with open(parsed_path, encoding="utf-8") as f:
        parsed = json.load(f)

    stops = parsed["stops"]
    meta = META[line_id]

    stops_out = []
    seen_notes = {}
    for s in stops:
        note = s["note"]
        stops_out.append({"seq": len(stops_out) + 1, "name": s["name"], **({"note": note} if note else {})})

    n_total = len(parsed["weekdayStartTimes"]) + len(parsed["saturdayStartTimes"])

    trips = []
    for i, start in enumerate(parsed["weekdayStartTimes"]):
        times = [s["times"][i] for s in stops]
        trips.append({"id": f"mo-fr-{i + 1}", "service": "weekday", "start": start, "times": times})
    for i, start in enumerate(parsed["saturdayStartTimes"]):
        col = n_weekday + i
        times = [s["times"][col] for s in stops]
        trips.append({"id": f"sa-{i + 1}", "service": "saturday", "start": start, "times": times})

    out = {
        "id": line_id,
        "shortName": meta["shortName"],
        "longName": meta["longName"],
        "color": meta["color"],
        "validFrom": meta["validFrom"],
        "source": "manual-pdf",
        "sourceFile": f"source-pdfs/linie-{line_id}.pdf",
        "notes": NOTES,
        "stops": stops_out,
        "trips": trips,
    }

    out_path = f"../lines/linie-{line_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"-> {out_path}: {len(stops_out)} Haltestellen, {len(trips)} Fahrten", file=sys.stderr)


if __name__ == "__main__":
    main()
