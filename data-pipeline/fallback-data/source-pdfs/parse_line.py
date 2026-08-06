#!/usr/bin/env python3
"""
Parst eine pdftotext -table Ausgabe eines Artmeier-Stadtbus-Fahrplans in strukturiertes JSON.

Statt Spalten aus einer einzelnen (potenziell lückenhaften) Kopfzeile abzuleiten, werden
die Spaltenzentren aus ALLEN Zeitwerten aller Zeilen per Clustering ermittelt (x-Position
sammeln, sortieren, bei Lücke > threshold neue Spalte). Das ist robust gegenüber Zeilen mit
fehlenden Werten (Kurzfahrten/Verzweigungen), da fehlende Zellen in einer Zeile die
Spaltenerkennung nicht verfälschen, solange genug andere Zeilen die Spalte belegen.
"""
import json
import re
import sys

TIME_RE = re.compile(r"\d{2}:\d{2}")
# Zeitwerte können ein Suffix tragen: "13:10AB" (nur Bedarf zum Aussteigen) oder mit
# vorangestelltem "*" auf Schultage beschränkt sein ("*S" o.ä. direkt an der Zeile) - wird
# für v1 ignoriert (Zeit wird trotzdem übernommen, siehe SPIKE_FINDINGS/Linie-Notes).
TIME_WITH_SUFFIX_RE = re.compile(r"\d{2}:\d{2}(?:\*?[A-Z]{1,2})?")
MARKER_RE = re.compile(r"\b(an|ab)\b")
SKIP_NAME_SUBSTRINGS = []  # (frei für zeilenspezifische Ausnahmen, aktuell keine nötig)


def cluster_columns(all_positions, gap_threshold=4):
    positions = sorted(all_positions)
    clusters = []
    current = [positions[0]]
    for p in positions[1:]:
        if p - current[-1] > gap_threshold:
            clusters.append(current)
            current = [p]
        else:
            current.append(p)
    clusters.append(current)
    return [sum(c) / len(c) for c in clusters]


def main():
    path = sys.argv[1]
    n_weekday = int(sys.argv[2])
    n_saturday = int(sys.argv[3])
    expected = n_weekday + n_saturday

    with open(path, encoding="utf-8") as f:
        raw_lines = f.read().splitlines()

    # Tabellenbereich eingrenzen: ab erster Zeile mit "Verkehrstage", bis "Anmerkungen"/"Erklärungen"
    start = next(i for i, l in enumerate(raw_lines) if "Verkehrstage" in l)
    end = len(raw_lines)
    for i, l in enumerate(raw_lines):
        if i > start and (l.strip().startswith("Anmerkungen") or l.strip().startswith("Erkl")):
            end = i
            break
    body = raw_lines[start:end]

    rows = []  # (name, note, [(x, "HH:MM"), ...])
    for line in body:
        if not TIME_RE.search(line):
            continue
        stripped = line.strip()
        if stripped.startswith("Verkehrstage") or stripped.startswith("Verkehrshinweise"):
            continue
        if any(sub in line for sub in SKIP_NAME_SUBSTRINGS):
            continue
        matches = [(m.start(), m.group(0)[:5]) for m in TIME_WITH_SUFFIX_RE.finditer(line)]
        first_time_pos = matches[0][0]
        prefix = line[:first_time_pos]
        # Marker steht direkt vor der ersten (tatsächlich vorhandenen) Zeit, ggf. mit viel
        # Whitespace dazwischen falls Spalte 0 bei dieser Fahrt fehlt (z.B. Kurzfahrt) -
        # daher am Ende des gesamten prefix suchen, nicht nur in den letzten paar Zeichen.
        m = re.search(r"\b(an|ab)\s*$", prefix)
        note = m.group(1) if m else None
        name_part = prefix[: m.start()] if m else prefix
        name = name_part.strip()
        name = re.sub(r"^Stammstrecke\s+", "", name)
        if not name:
            continue
        rows.append({"name": name, "note": note, "raw": matches})

    all_x = [x for r in rows for (x, _) in r["raw"]]
    col_centers = cluster_columns(all_x)
    if len(col_centers) != expected:
        print(f"WARNUNG: {len(col_centers)} Spalten erkannt, erwartet {expected}", file=sys.stderr)
        print("Spaltenzentren:", [round(c, 1) for c in col_centers], file=sys.stderr)

    def assign(raw):
        out = [None] * len(col_centers)
        for x, val in raw:
            # nächstgelegene Spalte
            best_i = min(range(len(col_centers)), key=lambda i: abs(col_centers[i] - x))
            out[best_i] = val
        return out

    stops = []
    for r in rows:
        times = assign(r["raw"])
        stops.append({"name": r["name"], "note": r["note"], "times": times})

    if stops:
        weekday_starts = stops[0]["times"][:n_weekday]
        saturday_starts = stops[0]["times"][n_weekday:]
    else:
        weekday_starts = saturday_starts = []

    n_missing_total = sum(1 for s in stops for t in s["times"] if t is None)
    print(f"Haltestellen-Zeilen: {len(stops)}, Spalten: {len(col_centers)}, fehlende Zellen: {n_missing_total}", file=sys.stderr)
    for s in stops:
        idxs_missing = [i for i, t in enumerate(s["times"]) if t is None]
        if idxs_missing:
            wd_missing = [i for i in idxs_missing if i < n_weekday]
            sa_missing = [i - n_weekday for i in idxs_missing if i >= n_weekday]
            wd_ok = not wd_missing or wd_missing == list(range(min(wd_missing), n_weekday))
            sa_ok = not sa_missing or sa_missing == list(range(min(sa_missing), n_saturday))
            flag = "" if (wd_ok and sa_ok) else " <<< NICHT-TRAILING, PRÜFEN"
            print(f"  {s['name']!r} note={s['note']}: fehlt bei {idxs_missing}{flag}", file=sys.stderr)

    result = {"weekdayStartTimes": weekday_starts, "saturdayStartTimes": saturday_starts, "stops": stops}
    out_path = path.rsplit(".", 1)[0] + ".parsed.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"-> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
