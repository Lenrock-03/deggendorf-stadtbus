# Changelog

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
