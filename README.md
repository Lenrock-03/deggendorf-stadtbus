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

## Status

- ✅ Alle 4 Linien vollständig (Werktags- und Samstagsfahrplan, verifiziert gegen die PDFs)
- Linie 2 (Hirzau – Rörerstraße) hat echte Streckenverzweigungen (Großwalding-Ast) und
  zwei Schultag-Sonderfahrten (im Fahrplan mit „S" markiert) – diese sind ohne
  Schultage-Filterung als normale Fahrten enthalten; ebenso werden „nur Bedarf zum
  Aussteigen"-Halte (AB) wie normale Abfahrten angezeigt. Details siehe
  `data-pipeline/SPIKE_FINDINGS.md`.
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

**Deployment ist manuell per SSH** (keine GitHub-Actions-Automatisierung, bewusste
Entscheidung - wie beim Rest des DriveTrack-Ökosystems):

```bash
ssh VPS-Kornel "cd /root/deggendorf-stadtbus && git pull && docker compose up -d --build"
```

Läuft auf dem VPS unter `127.0.0.1:8091`, dahinter ein system-nginx als Reverse Proxy mit
Let's-Encrypt-TLS für `deggendorf-stadtbus.kornel-riedl.de` (Konfiguration nicht Teil dieses
Repos, liegt in `/etc/nginx/sites-enabled/` auf dem VPS, analog zu drivetrack-api).

## Zugabfahrten Deggendorf Hbf (`db-proxy/`)

Zusätzlich zu den 4 Stadtbuslinien zeigt die Abfahrtstafel für Deggendorf Hbf auch
Zugabfahrten, über einen kleinen eigenen Backend-Service (`db-proxy/`), der die offizielle
[DB Timetables API](https://developers.deutschebahn.com/db-api-marketplace/apis/product/timetables)
kapselt (Client-ID/API-Key bleiben serverseitig, landen nie im Client-Code).

**Einmalige Einrichtung:**
1. Bei [developers.deutschebahn.com](https://developers.deutschebahn.com/db-api-marketplace/apis/start)
   registrieren (eigenes DB-Kundenkonto), eine Anwendung anlegen, das kostenlose
   "Timetables"-Produkt abonnieren. Client-ID + Client-Secret werden beim Anlegen einmalig
   angezeigt - notieren.
2. Für lokale Entwicklung ohne Docker (`cd db-proxy && npm start`): `db-proxy/.env.example`
   nach `db-proxy/.env` kopieren, `DB_CLIENT_ID`/`DB_API_KEY` eintragen.
3. Für den Docker-/VPS-Betrieb (`docker compose up`, siehe unten): stattdessen `.env.example`
   im Repo-Root nach `.env` kopieren und dort befüllen - `docker-compose.yml` liest die
   Variablen von dort (Variablen-Substitution, nicht `env_file`, damit ein Fehlen dieser
   Datei nicht den ganzen Stack inkl. `app`-Service blockiert).
4. Lokal testen: `cd db-proxy && npm install && npm start`, dann
   `curl http://localhost:3000/api/db/departures`.

**Zusätzlicher manueller VPS-Schritt** (nicht Teil von `docker compose up`, da außerhalb
dieses Repos): das externe system-nginx auf dem VPS braucht eine neue `location /api/db/`,
die auf `127.0.0.1:${DB_PROXY_PORT:-8092}` weiterleitet, analog zur bestehenden
`deggendorf-stadtbus.kornel-riedl.de`-Konfiguration. Ohne diesen Schritt bleibt der
Zugabfahrten-Block auf der Live-Seite leer (Fehler wird still ignoriert, siehe
`StopBoard.tsx` - die Bus-Abfahrtstafel funktioniert unabhängig davon immer).

Nur Deggendorf Hbf wird unterstützt (EVA-Nummer `8001397`, fest hinterlegt in
`db-proxy/src/constants.ts`) - kein beliebiger Stationsparameter, kein Routenplaner-Anschluss
(die DB-API liefert nur Abfahrtstafeln, keine A→B-Verbindungssuche).

## Native App (Android, Capacitor)

Für den Eigengebrauch gibt es eine native Android-Variante (Sideload, kein Play-Store-Eintrag).
Läuft komplett aus dem lokal gebündelten `dist/`-Ordner (inkl. Fahrplandaten) - funktioniert
also auch ganz ohne Internet, gleicht Daten aber im Hintergrund mit der Live-Seite ab, wenn
Internet verfügbar ist (siehe `app/src/lib/useSchedule.ts`).

```bash
cd app
npm run build:android    # baut mit HashRouter statt BrowserRouter, ohne Service Worker
npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Voraussetzung: Android Studio/SDK/JDK 21 (bringt Android Studio selbst mit, siehe
`android/jbr`) sowie `adb` mit USB-Debugging am Zielgerät.
