# motis/

Self-hosted [Motis](https://github.com/motis-project/motis) routing engine, the backend
`api/` proxies `/api/journeys` to (siehe `api/src/motisClient.ts`). Ersetzt die vorherige
eigene `findJourneys()`-Heuristik (siehe CLAUDE.md für die Begründung).

## `osm/deggendorf.osm.pbf`

Zugeschnittener OpenStreetMap-Auszug, den Motis für Fußweg-/Straßenrouting braucht (neben dem
zur Build-Zeit erzeugten GTFS, siehe `data-pipeline/src/gtfsExport.ts`). Klein genug zum
Committen (~6.5MB), ändert sich selten (Straßennetz), daher kein Teil des regulären
Build-Prozesses.

**Gewinnung** (live gegen den tatsächlichen VPS verifiziert, nicht nur angenommen):

```bash
# 1. Regionalen Auszug laden (Niederbayern deckt Deggendorf ab)
curl -sSL -o niederbayern-latest.osm.pbf \
  https://download.geofabrik.de/europe/germany/bayern/niederbayern-latest.osm.pbf

# 2. Auf die Deggendorf-Bounding-Box zuschneiden - WICHTIG: -s complete_ways DIREKT auf der
#    Quelldatei, NICHT zweistufig über einen -s simple-Zwischenschritt. Ein -s simple-
#    Zwischenschritt lässt Wege, die den Rand kreuzen, auf fehlende Knoten verweisen
#    ("dangling references") - Motis bricht den Import dann mit "unable to import: invalid
#    location" ab (im Test reproduziert). complete_ways direkt auf der Quelldatei vermeidet
#    das, braucht dafür aber mehr Arbeitsspeicher (siehe unten).
osmium extract -s complete_ways -b 12.78,48.73,13.10,48.93 \
  niederbayern-latest.osm.pbf -o deggendorf.osm.pbf --overwrite
```

Bounding Box: grob aus den Haltestellen-Koordinaten (`data-pipeline/fallback-data/
stop-coords.json`, lat 48.81–48.87, lon 12.94–13.00) plus Rand für realistische
Fußweg-Konnektivität und künftige "Adresse in der Nähe"-Anfragen leicht außerhalb der Stadt.

**Speicherbedarf**: `osmium extract -s complete_ways` braucht beim Zuschneiden eines
Regionalauszugs (unabhängig von dessen Dateigröße - der Knoten-Index skaliert mit der
OSM-ID-Spanne, nicht mit der Auszugsgröße) ca. 3GB RAM. Auf einem knapp bemessenen VPS ggf.
vorübergehend mehr Swap einrichten:

```bash
fallocate -l 4G /swapfile-tmp && mkswap /swapfile-tmp && swapon /swapfile-tmp
# ... osmium extract ...
swapoff /swapfile-tmp && rm /swapfile-tmp   # danach wieder entfernen, falls nur temporär gedacht
```

Refresh selten nötig (Straßennetz ändert sich kaum) - bei Bedarf die beiden Befehle oben
erneut ausführen und `deggendorf.osm.pbf` neu committen.

## Motis-Version

`motis/Dockerfile` lädt eine gepinnte statische Release-Binary von GitHub (kein Build aus
Quellcode nötig, kein JVM, kein schweres Framework - passt zur sonstigen
Dependency-arm-Linie des Projekts). Version in `ARG MOTIS_VERSION` im Dockerfile.

## Datensatz-Präfix ("gtfs_")

Motis hängt den in `config.yml` unter `datasets:` verwendeten Schlüssel ("gtfs", aus dem
Dateinamen `gtfs.zip` abgeleitet) als Präfix an jede Haltestellen-/Linien-/Trip-ID (z.B.
`gtfs_deggendorf-klinikum`). `api/src/motisClient.ts` (Konstante `FEED_ID`) und
`api/src/motisTranslate.ts` kennen dieses Präfix und fügen es an/entfernen es wieder - bei
Änderungen am GTFS-Dateinamen diese Konstante mit anpassen.
