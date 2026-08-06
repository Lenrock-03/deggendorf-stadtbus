# Changelog

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
