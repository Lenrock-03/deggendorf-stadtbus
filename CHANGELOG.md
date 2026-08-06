# Changelog

## v1.7.0

- Routenplaner (`/verbindung`): Verbindungssuche zwischen zwei beliebigen Haltestellen
  - findet Direktverbindungen und Verbindungen mit einmal Umsteigen an echten
    Umstiegshaltestellen (von ≥2 Linien bedient)
  - Datum + Uhrzeit wählbar, Start/Ziel tauschbar
  - Dedupliziert Verbindungen mit identischen Fahrten über unterschiedliche mögliche
    Umstiegspunkte; bei gleicher Ankunftszeit wird die Verbindung mit kürzerer
    Wartezeit bevorzugt
  - Im Browser mit echten Daten verifiziert (Linie 1 → Linie 4 über mehrere
    Stammstrecken-Haltestellen)

## v1.6.0

- **Hotfix:** Favoriten-Store (`lib/favorites.ts`) verursachte eine Endlosschleife
  (React error #185) auf jeder Seite, die Favoriten anzeigt (Startseite, Suche,
  Abfahrtstafel) - `useSyncExternalStore`'s `getSnapshot()` gab bei jedem Aufruf ein neues
  Array zurück statt eine stabile Referenz. Betraf bereits v1.5.0 live.
- Kartenansicht (`/karte`, Leaflet + OSM-Tiles): alle Haltestellen mit bekannten
  Koordinaten, Favoriten farblich hervorgehoben, Klick auf Marker führt zur Abfahrtstafel

## v1.5.0

- Dark/Light-Mode manuell umschaltbar (Button im Header, überstimmt Systemeinstellung,
  in localStorage gemerkt)
- Favoriten: Haltestellen per Stern merken (Suche, Abfahrtstafel, Startseite), lokal im
  Browser gespeichert
- Echter bayerischer Feiertags-/Schulferienkalender (berechnete bewegliche Feiertage +
  offizielle Ferientermine): kein Verkehr an Feiertagen, Heiligabend/Silvester-
  Sonderregel, Abfahrtstafel jetzt mit echtem Datumspicker statt nur Wochentag
- Linie 2 fertiggestellt: die beiden Schultag-Fahrten laufen jetzt als eigener
  "schoolday"-Service (nur an tatsächlichen Schultagen, nicht in den Ferien), Bedarfshalte
  ("nur Aussteigen") werden korrekt markiert statt wie normale Abfahrten behandelt

## v1.4.0

- Liniendetail zeigt beim Einstieg über die Linienübersicht jetzt nur den reinen
  Streckenverlauf ohne Uhrzeit (wie zuvor) - Uhrzeiten werden erst angezeigt, wenn eine
  konkrete Abfahrt gewählt wurde (Dropdown, oder Klick auf eine Abfahrt in der
  Abfahrtstafel einer Haltestelle, die jetzt direkt zur passenden Zeitleiste verlinkt,
  URL-Parameter `?trip=...`)

## v1.3.0

- Liniendetail komplett neu als Fahrtverlauf-Zeitleiste (Nahverkehr-Kartenstil: farbige
  Linie mit Punkten, Start/Ziel groß/fett hervorgehoben, Uhrzeit pro Halt)
- Abfahrt wählbar (Dropdown aller Fahrten der Linie), Standardauswahl = nächste heute
  noch aktive Fahrt
- Kurzfahrten ("short workings", z.B. Linie 1 letzte Fahrt) zeigen korrekt nur die
  tatsächlich bediente Teilstrecke statt der vollen Ringlinie

## v1.2.0

- "Standort verwenden" in der Haltestellensuche: sortiert Haltestellen per Browser-
  Geolocation-API nach Entfernung, zeigt die Distanz an
- Haltestellen-Koordinaten (94 von 101, ~93%) aus OpenStreetMap ergänzt (einmaliger
  Build-Zeit-Abgleich per Namen, `data-pipeline/src/fetchStopCoords.ts`, Ergebnis in
  `fallback-data/stop-coords.json` committet - kein Live-API-Call zur Laufzeit)
- OSM-Attribution (ODbL) in der App ergänzt

## v1.1.0

- Linie 2 (Hirzau – Stammstrecke – Rörerstraße) ergänzt. Musste neu analysiert werden:
  die Spaltenstruktur hat tatsächlich 17 Werktagsfahrten (nicht 13 wie ursprünglich
  angenommen), zwei davon nur an Schultagen. Ein Marker-Erkennungsbug im PDF-Parser
  (an/ab ging bei fehlendem ersten Zeitwert verloren) wurde dabei gefunden und behoben.
- Deployment von GitHub Pages auf eigenen VPS (Docker + nginx + Let's Encrypt) umgestellt,
  läuft jetzt unter https://deggendorf-stadtbus.kornel-riedl.de

## v1.0.0

Erste Version: Fahrplan-PWA für den Stadtbus Deggendorf.

- Linien 1, 3, 4 mit vollständigem Werktags-/Samstagsfahrplan (aus den offiziellen
  PDF-Fahrplänen von Artmeier Bus GmbH & Co. KG übertragen)
- Linienübersicht, Liniendetail (Haltestellenfolge), Haltestellensuche, Abfahrtstafel
  ("Nächste Abfahrten" + Fahrplan nach Wochentag)
- Kalenderbewusste Abfahrtsberechnung inkl. Mitternachtsüberlauf-Handling
- Installierbare PWA (Manifest, Service Worker, Icons)
- GitHub-Actions-Workflows für Deployment (GitHub Pages) und wöchentlichen Daten-Refresh
- Linie 2 bewusst noch nicht enthalten (echte Verzweigungen/Schultag-Sonderfahrten,
  siehe README)
