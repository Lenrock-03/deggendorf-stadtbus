# Deggendorf Stadtbus

Eine einfache, installierbare Web-App (PWA) mit den Fahrplänen der 4 Deggendorfer Stadtbuslinien
(betrieben von Artmeier Bus GmbH & Co. KG) – weil diese in keiner gängigen ÖPNV-App auftauchen.

**v1-Umfang:** Linien browsen, Haltestellen suchen, Abfahrtszeiten ansehen (statischer Sollfahrplan).
Kein Live-Tracking, kein Routenplaner, keine Favoriten (siehe Plan für Details/Roadmap).

## Struktur

- `data-pipeline/` – lädt/filtert GTFS-Daten (oder manuelle Fallback-Daten) und erzeugt kompakte
  JSON-Bundles für die App.
- `app/` – Vite + React + TypeScript PWA, liest die generierten JSON-Bundles aus `app/public/data/`.

## Datenquelle

Primär: [gtfs.de](https://gtfs.de) (deutschlandweiter GTFS-Datensatz aus dem offiziellen DELFI-Datensatz,
CC-BY 4.0, kostenlos, unbegrenzt). Falls Artmeier/Deggendorf dort nicht abgedeckt ist: manuelle
Übertragung aus den offiziellen PDF-Fahrplänen von [deggendorf.de](https://www.deggendorf.de/leben/mobilitaet-verkehr/stadtbusverkehr)
in `data-pipeline/fallback-data/` (gleiches Schema wie GTFS, damit die App quellen-unabhängig bleibt).

Fahrplandaten "ohne Gewähr" – im Zweifel gilt immer der offizielle Fahrplan.
