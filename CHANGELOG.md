# Changelog

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
