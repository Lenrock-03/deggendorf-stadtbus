# Deggendorf Stadtbus

Eine einfache, installierbare Web-App (PWA) mit den Fahrplänen der 4 Deggendorfer Stadtbuslinien
(betrieben von Artmeier Bus GmbH & Co. KG) – weil diese in keiner gängigen ÖPNV-App auftauchen.

Live: https://deggendorf-stadtbus.kornel-riedl.de

## Struktur

- `data-pipeline/` – lädt/filtert GTFS-Daten (oder manuelle Fallback-Daten) und erzeugt kompakte
  JSON-Bundles.
- `app/` – Vite + React + TypeScript PWA, liest die generierten JSON-Bundles aus `app/public/data/`
  direkt und enthält die komplette Fahrplan-/Routenplaner-Logik selbst.
- `api/` – Node-Backend (Zugabfahrten Deggendorf Hbf + REST-API für die native App, siehe unten).
- `android/` – native Kotlin/Jetpack-Compose-App (in Aufbau), dünner Client gegen `api/`.

Details zur Architektur/Aufteilung siehe `CLAUDE.md`.

## Datenquelle

Primär: [gtfs.de](https://gtfs.de) (deutschlandweiter GTFS-Datensatz aus dem offiziellen DELFI-Datensatz,
CC-BY 4.0, kostenlos, unbegrenzt). Falls Artmeier/Deggendorf dort nicht abgedeckt ist: manuelle
Übertragung aus den offiziellen PDF-Fahrplänen von [deggendorf.de](https://www.deggendorf.de/leben/mobilitaet-verkehr/stadtbusverkehr)
in `data-pipeline/fallback-data/` (gleiches Schema wie GTFS, damit die App quellen-unabhängig bleibt).

Fahrplandaten "ohne Gewähr" – im Zweifel gilt immer der offizielle Fahrplan.

## Status

- ✅ Alle 4 Linien vollständig (Werktags- und Samstagsfahrplan, verifiziert gegen die PDFs)
- ✅ Haltestellensuche, Abfahrtstafel, Kartenansicht, Routenplaner (max. 1 Umstieg), Favoriten,
  Dark/Light-Mode, bayerischer Feiertagskalender
- ✅ Zugabfahrten an Deggendorf Hbf (offizielle DB-Timetables-API, siehe unten)
- Linie 2 (Hirzau – Rörerstraße) hat echte Streckenverzweigungen (Großwalding-Ast) und
  zwei Schultag-Sonderfahrten (im Fahrplan mit „S" markiert) – diese sind ohne
  Schultage-Filterung als normale Fahrten enthalten; ebenso werden „nur Bedarf zum
  Aussteigen"-Halte (AB) wie normale Abfahrten angezeigt. Details siehe
  `data-pipeline/SPIKE_FINDINGS.md`.
- Kein Live-Tracking (keine Echtzeit-API des Betreibers bekannt)

## Entwicklung

```bash
cd data-pipeline && npm install && npm run build   # erzeugt app/public/data/*.json
cd ../app && npm install && npm run dev             # http://localhost:5173
npm test                                             # Vitest (Kalenderlogik)
npm run build && npm run preview                     # Produktions-Build lokal prüfen
```

## Deployment (eigener VPS via Docker)

`docker-compose.yml` startet zwei Services:
- `app` – `Dockerfile` baut Pipeline+Web-App, serviert über nginx (`nginx.conf`, inkl.
  SPA-Fallback für React Router). Nur lokal gebunden auf `127.0.0.1:${APP_PORT:-8091}`.
- `api` – `api/Dockerfile` (Build-Context ist das Repo-Root, damit auch `data-pipeline/`
  mit reinkommt), nur lokal gebunden auf `127.0.0.1:${API_PORT:-8092}`.

Zugriff von außen läuft über den vorhandenen Reverse Proxy auf dem VPS.

Lokal bauen & starten:
```bash
docker compose up -d --build
```

**Deployment ist manuell per SSH** (keine GitHub-Actions-Automatisierung, bewusste
Entscheidung - wie beim Rest des DriveTrack-Ökosystems):

```bash
ssh VPS-Kornel "cd /root/deggendorf-stadtbus && git pull && docker compose up -d --build"
```

Dahinter ein system-nginx als Reverse Proxy mit Let's-Encrypt-TLS für
`deggendorf-stadtbus.kornel-riedl.de` (Konfiguration nicht Teil dieses Repos, liegt in
`/etc/nginx/sites-enabled/` auf dem VPS, analog zu drivetrack-api) – leitet `/` an `app` und
`/api/` an `api` weiter.

## Zugabfahrten Deggendorf Hbf & REST-API (`api/`)

Zusätzlich zu den 4 Stadtbuslinien zeigt die Abfahrtstafel für Deggendorf Hbf auch
Zugabfahrten, über die offizielle
[DB Timetables API](https://developers.deutschebahn.com/db-api-marketplace/apis/product/timetables)
(Client-ID/API-Key bleiben serverseitig, landen nie im Client-Code). Dieselbe `api/`-Instanz
stellt außerdem eine REST-API mit der kompletten Fahrplan-/Routenplaner-Logik bereit (Basis
für die native Android-App).

**Einmalige Einrichtung (nur für die DB-Zugdaten nötig, der Rest der API braucht keinen Key):**
1. Bei [developers.deutschebahn.com](https://developers.deutschebahn.com/db-api-marketplace/apis/start)
   registrieren (eigenes DB-Kundenkonto), eine Anwendung anlegen, das kostenlose
   "Timetables"-Produkt abonnieren. Client-ID + Client-Secret werden beim Anlegen einmalig
   angezeigt - notieren.
2. Für lokale Entwicklung ohne Docker (`cd api && npm start`): `api/.env.example`
   nach `api/.env` kopieren, `DB_CLIENT_ID`/`DB_API_KEY` eintragen.
3. Für den Docker-/VPS-Betrieb (`docker compose up`, siehe oben): stattdessen `.env.example`
   im Repo-Root nach `.env` kopieren und dort befüllen - `docker-compose.yml` liest die
   Variablen von dort (Variablen-Substitution, nicht `env_file`, damit ein Fehlen dieser
   Datei nicht den ganzen Stack blockiert).
4. Lokal testen: `cd api && npm install && npm start`, dann
   `curl http://localhost:3000/api/routes`.

**Zusätzlicher manueller VPS-Schritt** (nicht Teil von `docker compose up`, da außerhalb
dieses Repos): das externe system-nginx auf dem VPS braucht eine `location /api/`, die auf
`127.0.0.1:${API_PORT:-8092}` weiterleitet.

**Endpunkte** (alle GET, unauthentifiziert): `/api/routes`, `/api/routes/:id/outline`,
`/api/routes/:id/trips`, `/api/routes/:id/timeline?tripId=`, `/api/stops`,
`/api/stops/search?q=`, `/api/stops/nearest?lat=&lon=&count=`,
`/api/stops/:id/departures?mode=next|date&count=&date=`,
`/api/journeys?from=&to=&date=&afterMin=&maxResults=`, `/api/meta`, `/api/db/departures`
(nur Deggendorf Hbf, EVA `8001397`, fest hinterlegt in `api/src/constants.ts`).

Fällt die DB-Zug-Anbindung aus (fehlender/ungültiger Key), bleibt nur der Zugabfahrten-Block
auf der Abfahrtstafel leer (Fehler wird still ignoriert) – alle anderen Endpunkte
funktionieren unabhängig davon normal.

## Native App

Bis 2026-08 gab es eine Capacitor-basierte Android-App (Web-Code in einer WebView). Diese
wurde durch eine **native Kotlin/Jetpack-Compose-App** unter `android/` ersetzt (Architektur
angelehnt an das Schwesterprojekt DriveTrack, dünner Client gegen `api/`) – Details siehe
`CLAUDE.md`.
