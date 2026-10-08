# Deggendorf Stadtbus

Fahrplan-App für die 4 Deggendorfer Stadtbuslinien (Artmeier Bus GmbH & Co. KG) – tauchen in
keiner gängigen ÖPNV-App auf, deswegen diese eigene App. Live unter
`https://deggendorf-stadtbus.kornel-riedl.de`.

## Zugehörige Projekte

Kein Mehr-Repo-System wie DriveTrack – alles hier in einem Repo, aber vier eigenständige
Teilprojekte (jeweils eigenes `package.json`/Build):

1. **`data-pipeline/`** – lädt/parsed die Fahrplandaten (gtfs.de oder manuelle PDF-Fallback-
   Übertragung unter `data-pipeline/fallback-data/`) und erzeugt zwei Ausgaben aus derselben
   Quelle: das eigene JSON-Bundle `routes.json`/`stops.json`/`departures.json`/
   `calendar.json`/`meta.json`/`routeStops.json` (für `app/`) **und** (ab 2026-10,
   `gtfsExport.ts`) echtes GTFS (`gtfs.zip`, für `motis/`, siehe Punkt 5).
2. **`app/`** – Web-PWA (Vite/React/TS). Lädt die Pipeline-JSONs **direkt und statisch**
   (`app/public/data/*.json`) für Fahrplan-Browsing/Abfahrtstafel, enthält dafür die
   entsprechende Logik selbst (`app/src/lib/*.ts`). Die Verbindungssuche ist seit der
   Motis-Umstellung (Punkt 5) die **eine bewusste Ausnahme**: sie versucht zuerst `api/`
   (→ Motis), fällt bei Fehlschlag/Timeout auf die weiterhin vorhandene lokale
   `findJourneys()`-Berechnung zurück (`app/src/lib/journeysClient.ts` +
   `RoutePlanner.tsx`) – alles andere bleibt ohne Backend-Abhängigkeit.
3. **`api/`** (bis 2026-08 `db-proxy/`) – Node/tsx-Backend, kein Framework. Aufgaben:
   - Offizielle DB-Timetables-API kapseln (Zugabfahrten Deggendorf Hbf, `DB_CLIENT_ID`/
     `DB_API_KEY` bleiben serverseitig, siehe `.env`).
   - **1:1-TypeScript-Port** von Kalenderlogik/Linienverlauf/Haltestellensuche wie in
     `app/src/lib/` (eigene Kopien in `api/src/`, nicht per npm-Workspace geteilt) +
     REST-Endpunkte darüber – Backend für die native Android-App (siehe Punkt 4).
   - `GET /api/journeys` ist seit 2026-10 ein reiner **Proxy zur Motis-Routing-Engine**
     (`motisClient.ts`/`motisTranslate.ts`, siehe Punkt 5) – keine eigene Routenplaner-Logik
     mehr in `api/` (die frühere `routePlanner.ts` wurde entfernt).
4. **`android/`** (ab 2026-08) – native Kotlin/Jetpack-Compose-App, dünner REST-Client gegen
   `api/`. Architektur/Code-Stil bewusst an `DriveTrack`
   (`C:\Users\korne\Downloads\DriveTrack\DriveTrack`) angelehnt: kein Hilt/Koin, kein
   ViewModel, kein Retrofit (`HttpURLConnection`+`org.json` wie DriveTracks `ServerApi.kt`),
   kein Navigation-Compose-Graph (enum-Bottom-Tabs + nullable-ID-State), osmdroid statt
   Google Maps. Löst die vorherige Capacitor-Android-App komplett ab (entfernt).
5. **`motis/`** (ab 2026-10) – selbst gehostete [Motis](https://github.com/motis-project/motis)
   Routing-Engine (MIT, statische Binary, kein JVM) statt der früheren eigenen
   `findJourneys()`-Heuristik, die einen echten Bug hatte (sinnloser Umstieg auf dieselbe
   Linie bei den Rundstrecken) und nur max. 1 Umstieg konnte. Bekommt GTFS von
   `data-pipeline/` + einen committeten OSM-Ausschnitt (`motis/osm/`, siehe
   `motis/README.md`). Läuft rein intern im Docker-Compose-Netz, nur `api/` spricht mit ihr
   (`MOTIS_URL`). **Wichtig**: Motis hängt den Datensatz-Key `"gtfs"` als Präfix an jede
   Haltestellen-/Linien-/Trip-ID – `api/src/motisClient.ts`/`motisTranslate.ts` fügen ihn
   an/entfernen ihn wieder, damit IDs weiterhin zu unseren eigenen passen.

**Bewusste Konsequenz aus Punkt 2+3**: Kalenderlogik (`calendar.ts`/`holidays.ts`),
Linienverlauf (`tripTimeline.ts`) etc. existieren weiterhin **doppelt** (TypeScript in `app/`
UND in `api/`, jetzt zusätzlich eine dritte, build-zeit-only Kopie der Feiertagslogik in
`data-pipeline/src/holidays.ts` für `gtfsExport.ts`) – Änderungen an der Fachlogik müssen in
**allen Kopien** nachgezogen werden. Der Routenplaner selbst ist davon ausgenommen: nur noch
eine aktive Kopie in `app/src/lib/routePlanner.ts` (Offline-Fallback), `api/` hat keine
eigene mehr (Motis-Proxy). Kein Duplikat: die native Android-App selbst, die ausschließlich
`api/` konsumiert.

## Datenquelle & Aktualität

`data-pipeline/` läuft aktuell **manuell** (kein automatisierter wöchentlicher Rebuild trotz
ursprünglicher Planung dafür) – nach PDF-Änderungen der Artmeier Bus GmbH von Hand neu
ausführen und deployen. Schulferien-Tabelle in `holidays.ts`
(`SCHOOL_HOLIDAY_RANGES`) ist **hart kodiert für die Schuljahre 2025/26 + 2026/27** – muss
jährlich von Hand um das nächste Schuljahr ergänzt werden (Quelle: km.bayern.de), in
**beiden** Kopien (`app/src/lib/holidays.ts` und `api/src/holidays.ts`).

## Bekannte Stolpersteine (bereits gelöst, für Kontext)

- **DB-Timetables-API-Feldname**: heißt `ppth`, nicht `pth` (naheliegender, aber falscher
  Name) – ohne diesen Fix war das Fahrtziel bei Zugabfahrten immer leer. Siehe
  `api/src/dbClient.ts`.
- **`db-vendo-client` (inoffizielle DB/HAFAS-API)**: aktuell komplett blockiert
  (`OPS_BLOCKED`/403), sowohl von Wohn- als auch von VPS-Hosting-IPs aus getestet – laut
  Projekt-eigener Doku ein bekanntes, anhaltendes Problem. Deshalb bewusst NICHT für
  Regionalbus-/Zugdaten verwendet, stattdessen die offizielle, aber funktional kleinere
  DB-Timetables-API (nur Abfahrtstafel Deggendorf Hbf, kein A→B-Routing, keine Regionalbusse).
- **`docker-compose.yml` + `env_file`**: NIE `env_file: ./irgendwas/.env` für optionale
  Secrets verwenden – eine fehlende Datei lässt `docker compose up` für **alle** Services
  scheitern, nicht nur den betroffenen. Stattdessen `environment: { VAR: ${VAR:-} }`
  (Variablen-Substitution aus einer Root-`.env` oder der Shell), leer per Default möglich.
- **Externe VPS-nginx-Config, Backup-Dateien**: beim manuellen Editieren der Site-Configs
  unter `/etc/nginx/sites-enabled/` NIE eine Backup-Kopie im selben Verzeichnis liegen
  lassen – nginx lädt dort standardmäßig alle Dateien (auch `*.bak-*`), das erzeugt
  "conflicting server name"-Warnungen durch doppelt geladene Server-Blöcke. Backups nach
  `/root/nginx-backups/` o.ä. verschieben.
- **`isCapacitor`/`VITE_CAPACITOR`-Gating**: existierte 2026-08 kurzzeitig in `app/` (Web +
  Capacitor-Android aus einer Codebase), wurde mit der Umstellung auf die native
  Kotlin-App wieder vollständig entfernt – falls das in altem Verlauf/Diffs auftaucht: ist
  bewusst rückgebaut, nicht versehentlich verloren gegangen.
- **Adress-Geocoding (`api/src/geocode.ts`)**: nutzt den öffentlichen Nominatim-Dienst
  (OpenStreetMap) für die Adresssuche in der Android-Verbindungssuche (`getStopsNearAddress`,
  `/api/stops/near-address`) – kostenlos, kein API-Key, aber Nutzungsrichtlinien beachten
  (max. 1 Anfrage/Sekunde, aussagekräftiger `User-Agent`, kein Bulk-Geocoding). Bei spürbar
  mehr Traffic ggf. auf einen selbst gehosteten Nominatim-Server oder einen anderen Anbieter
  wechseln – der In-Memory-Cache in `geocode.ts` mildert Wiederholungen während des Tippens,
  ersetzt aber keine Rate-Begrenzung bei vielen gleichzeitigen Nutzern.
- **Material3 `ExposedDropdownMenuBox` + `OutlinedTextField`**: wenn `onValueChange` im selben
  Zug `expanded` mitsetzt, kollidiert das Popup-/Anchor-Handling dieser Komponente mit dem
  InputConnection des Textfelds (Symptom: zwei Rücktasten-Drücke nötig, um ein Zeichen zu
  löschen; getippter Text „verschluckt" Zwischenzustände). `StopAutocomplete.kt` nutzt deshalb
  bewusst kein `ExposedDropdownMenuBox`, sondern eine simple inline unter dem Feld
  eingeblendete Vorschlagsliste ohne eigenes Popup.
- **`osmium extract -s complete_ways`**: braucht beim Zuschneiden eines Regionalauszugs ca.
  3GB RAM, **unabhängig von der Dateigröße** (der Knoten-Index skaliert mit der
  OSM-ID-Spanne, nicht mit der Auszugsgröße) – ein zweistufiges Vorgehen (erst `-s simple`
  zum Verkleinern, dann `-s complete_ways` auf dem bereits kleinen Zwischenergebnis) spart
  dabei **nichts** und führt zu fehlenden Knoten-Referenzen, die Motis beim Import mit
  "unable to import: invalid location" quittiert (im Test reproduziert) – `complete_ways`
  immer direkt auf der ungekürzten Quelldatei ausführen. Siehe `motis/README.md`.
- **Motis-Haltestellen-/Linien-IDs haben ein `"gtfs_"`-Präfix** (aus dem Datensatz-Key in
  `config.yml`, abgeleitet vom Dateinamen `gtfs.zip`) – `api/src/motisClient.ts`
  (`FEED_ID`-Konstante) hängt ihn beim Request an, `motisTranslate.ts` entfernt ihn wieder.
  Bei Änderung des GTFS-Dateinamens beide Stellen anpassen.
- **Motis kann Start/Ziel per kurzem Fußweg auf eine Nachbarhaltestelle verschieben** (z.B.
  "Oberer Stadtplatz West"/"Ost" – zwei Bahnsteige desselben Platzes, 0m Luftlinie) – im
  Live-Test beobachtet. `motisTranslate.ts` toleriert das bis 100m (gleicher Wert wie Motis'
  eigenes `link_stop_distance`), verwirft aber Itinerare mit einem echten Fußweg-Rand (z.B.
  13min zur eigentlich gesuchten Haltestelle), da `Journey`/`JourneyLeg` keine Fußwege
  kennen und das sonst fälschlich als "angekommen" an der falschen Haltestelle angezeigt
  würde.
- **VPS-Arbeitsspeicher ist knapp bemessen** (3.8GB, viele weitere Dienste laufen dort -
  Immich, Nextcloud, Home Assistant, u.a.) – seit der Motis-Einrichtung läuft dauerhaft eine
  6GB-Swap-Datei (`/swapfile` + `/swapfile2`, in `/etc/fstab` verankert) als Sicherheitsnetz
  für speicherintensive einmalige Schritte (z.B. OSM-Zuschnitt, Motis-Import). Bei weiteren
  speicherhungrigen Aufgaben auf diesem VPS: `free -h` vorher prüfen.

## Deployment

Manuell per SSH, kein CI/CD (bewusste Entscheidung, wie bei DriveTrack):
```bash
ssh VPS-Kornel "cd /root/deggendorf-stadtbus && git pull && docker compose up -d --build"
```
`app` (Web-PWA/nginx), `api` und `motis` (siehe Punkt 5 oben) laufen als drei
Docker-Compose-Services - `motis` rein intern, nicht öffentlich erreichbar. Dahinter ein
system-nginx auf dem VPS (Config nicht Teil dieses Repos) mit Let's-Encrypt-TLS. Root-`.env`
(aus `.env.example`) hält `DB_CLIENT_ID`/`DB_API_KEY` für `api`.

## Versionierung

Wie bei DriveTrack: Semantic Versioning, `CHANGELOG.md` (Keep-a-Changelog-Format), Git-Tag
`vX.Y.Z` + `git push --tags`, manuelles `gh release create`. Ein Repo, ein CHANGELOG für
`data-pipeline/`+`app/`+`api/` gemeinsam (aktuell v1.10.1) – `android/` bekommt eine
**eigene** Versionshistorie ab `v1.0.0`, sobald es existiert (eigenständiges Artefakt, analog
zu DriveTracks unabhängig versionierter App gegenüber Backend/Web).
