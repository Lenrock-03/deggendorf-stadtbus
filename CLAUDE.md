# Deggendorf Stadtbus

Fahrplan-App für die 4 Deggendorfer Stadtbuslinien (Artmeier Bus GmbH & Co. KG) – tauchen in
keiner gängigen ÖPNV-App auf, deswegen diese eigene App. Live unter
`https://deggendorf-stadtbus.kornel-riedl.de`.

## Zugehörige Projekte

Kein Mehr-Repo-System wie DriveTrack – alles hier in einem Repo, aber vier eigenständige
Teilprojekte (jeweils eigenes `package.json`/Build):

1. **`data-pipeline/`** – lädt/parsed die Fahrplandaten (gtfs.de oder manuelle PDF-Fallback-
   Übertragung unter `data-pipeline/fallback-data/`) und erzeugt `routes.json`/`stops.json`/
   `departures.json`/`calendar.json`/`meta.json`/`routeStops.json`.
2. **`app/`** – Web-PWA (Vite/React/TS). Lädt die Pipeline-JSONs **direkt und statisch**
   (`app/public/data/*.json`), enthält die komplette Fahrplan-/Routenplaner-Logik selbst
   (`app/src/lib/*.ts`) – bewusst **kein** Aufruf der `api/`-Endpunkte, um die bereits
   laufende, risikoarme Web-App nicht von einem neuen Backend abhängig zu machen.
3. **`api/`** (bis 2026-08 `db-proxy/`) – Node/tsx-Backend, kein Framework. Zwei Aufgaben:
   - Offizielle DB-Timetables-API kapseln (Zugabfahrten Deggendorf Hbf, `DB_CLIENT_ID`/
     `DB_API_KEY` bleiben serverseitig, siehe `.env`).
   - **1:1-TypeScript-Port** derselben Fahrplan-/Routenplaner-Logik wie in `app/src/lib/`
     (eigene Kopien in `api/src/`, nicht per npm-Workspace geteilt) + REST-Endpunkte darüber
     – Backend für die native Android-App (siehe Punkt 4), die dadurch komplett logikfrei
     bleiben kann.
4. **`android/`** (ab 2026-08 in Aufbau) – native Kotlin/Jetpack-Compose-App, dünner
   REST-Client gegen `api/`. Architektur/Code-Stil bewusst an `DriveTrack`
   (`C:\Users\korne\Downloads\DriveTrack\DriveTrack`) angelehnt: kein Hilt/Koin, kein
   ViewModel, kein Retrofit (`HttpURLConnection`+`org.json` wie DriveTracks `ServerApi.kt`),
   kein Navigation-Compose-Graph (enum-Bottom-Tabs + nullable-ID-State), osmdroid statt
   Google Maps. Löst die vorherige Capacitor-Android-App komplett ab (entfernt).

**Bewusste Konsequenz aus Punkt 2+3**: Kalenderlogik (`calendar.ts`/`holidays.ts`),
Routenplaner (`routePlanner.ts`), Linienverlauf (`tripTimeline.ts`) etc. existieren aktuell
**doppelt** (TypeScript in `app/` UND in `api/`) – Änderungen an der Fachlogik (z.B. neue
Feiertagsregeln, Routenplaner-Bugfixes) müssen **in beiden Kopien** nachgezogen werden, bis
sich das ggf. mal zu einem npm-Workspace konsolidiert. Kein Duplikat dagegen: die native
Android-App selbst, die ausschließlich `api/` konsumiert.

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

## Deployment

Manuell per SSH, kein CI/CD (bewusste Entscheidung, wie bei DriveTrack):
```bash
ssh VPS-Kornel "cd /root/deggendorf-stadtbus && git pull && docker compose up -d --build"
```
`app` (Web-PWA/nginx) und `api` laufen als zwei Docker-Compose-Services, dahinter ein
system-nginx auf dem VPS (Config nicht Teil dieses Repos) mit Let's-Encrypt-TLS. Root-`.env`
(aus `.env.example`) hält `DB_CLIENT_ID`/`DB_API_KEY` für `api`.

## Versionierung

Wie bei DriveTrack: Semantic Versioning, `CHANGELOG.md` (Keep-a-Changelog-Format), Git-Tag
`vX.Y.Z` + `git push --tags`, manuelles `gh release create`. Ein Repo, ein CHANGELOG für
`data-pipeline/`+`app/`+`api/` gemeinsam (aktuell v1.10.1) – `android/` bekommt eine
**eigene** Versionshistorie ab `v1.0.0`, sobald es existiert (eigenständiges Artefakt, analog
zu DriveTracks unabhängig versionierter App gegenüber Backend/Web).
