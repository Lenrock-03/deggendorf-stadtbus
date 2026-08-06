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

## Status (v1.0.0)

- ✅ Linien 1, 3, 4 vollständig (Werktags- und Samstagsfahrplan, verifiziert gegen die PDFs)
- ⏳ Linie 2 (Hirzau – Rörerstraße) hat echte Streckenverzweigungen, Schultag-Sonderfahrten
  (`*S`) und Bedarfshalte (`AB`), die für eine sicher korrekte automatisierte Auswertung
  eine genauere manuelle Prüfung brauchen – bewusst zurückgestellt, siehe
  `data-pipeline/SPIKE_FINDINGS.md`
- Kein Routenplaner, keine Favoriten, kein garantierter Offline-Modus, kein Live-Tracking
  (siehe Plan für die v2-Roadmap)

## Entwicklung

```bash
cd data-pipeline && npm install && npm run build   # erzeugt app/public/data/*.json
cd ../app && npm install && npm run dev             # http://localhost:5173
npm test                                             # Vitest (Kalenderlogik)
npm run build && npm run preview                     # Produktions-Build lokal prüfen
```

## Deployment (eigener VPS via Docker)

`Dockerfile` baut Pipeline+App und serviert das Ergebnis über nginx (`nginx.conf`, inkl.
SPA-Fallback für React Router). `docker-compose.yml` bindet den Container nur auf
`127.0.0.1:${APP_PORT:-8091}` - Zugriff von außen läuft über den vorhandenen Reverse Proxy
auf dem VPS.

Lokal bauen & starten:
```bash
docker compose up -d --build
```

**Automatisches Deployment** (`.github/workflows/deploy.yml` bei Push auf `main`,
`data-refresh.yml` wöchentlich): GitHub Actions SSHt auf den VPS, macht dort `git pull` und
`docker compose up -d --build`. Dafür im Repo unter *Settings → Secrets and variables →
Actions* einmalig hinterlegen:

- Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (privater Deploy-Key), optional `VPS_PORT`
- Variables: `VPS_DEPLOY_PATH` (Ordner auf dem VPS, in dem dieses Repo geklont liegt/werden soll)

Der Deploy-Key braucht auf dem VPS nur Zugriff auf das Verzeichnis unter `VPS_DEPLOY_PATH`
und Rechte, dort `docker compose` auszuführen - kein Zugriff auf GitHub nötig.
