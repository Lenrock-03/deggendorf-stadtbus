# Changelog

## v1.9.5

- Navigation im Header ("Haltestelle suchen", "Karte", "Verbindung suchen") von reinen
  Textlinks zu Button-Pills umgestellt, inkl. Hervorhebung der gerade aktiven Seite
  (`NavLink` statt `Link`, neue `.nav-button`-Klasse in index.css)

## v1.9.4

- **Datenfehler behoben:** Linie 2 zeigte doppelte Abfahrten (z.B. "07:04 Deggendorf Hbf"
  zweimal direkt hintereinander), wodurch an manchen Haltestellen in der "Nächste
  Abfahrten"-Liste (feste Länge) andere Linien verdrängt wurden und fälschlich zu fehlen
  schienen. Ursache: das x-Positions-Spaltenclustering im PDF-Parser hatte bei Linie 2s
  breiter Tabelle 2 Phantom-Spalten erzeugt, die exakt eine bereits erkannte Fahrt noch
  einmal duplizierten (24 statt echter 22 Fahrten). `to_line_json.py` erkennt und
  bereinigt solche Nahezu-Duplikate jetzt automatisch (Abgleich der nicht-leeren
  Haltestellenzeiten zwischen allen Fahrten desselben Verkehrstags, >85% Übereinstimmung
  → zusammengeführt statt doppelt geführt).
- Linienfarben durch die tatsächlichen Farben aus den offiziellen Fahrplan-PDFs ersetzt
  (dort ist jede Linie durchgehend zeilenweise farblich hervorgehoben: Linie 1 grün,
  Linie 2 gelb, Linie 3 lachs/rot, Linie 4 blau - per Pixelanalyse der Original-PDFs
  bestimmt, vorher frei erfundene Hex-Werte). Da die rohen Tabellenfarben (v.a. das
  blasse Gelb) mit weißer Schrift auf Linenbadges kaum lesbar wären, wird die Textfarbe
  jetzt dynamisch nach Kontrast gewählt (`lib/color.ts`, WCAG-Luminanzformel) statt fix
  weiß.

## v1.9.3

- Service-Worker-Cache für Fahrplandaten von StaleWhileRevalidate auf NetworkFirst
  umgestellt: online wird immer die aktuelle Version von /data/*.json geladen (der Cache
  dient nur noch als Fallback ohne Verbindung). Vorher konnte ein bereits installierter/
  besuchter Nutzer nach einem Daten-Update (z.B. v1.9.2) beim ersten Öffnen noch die alte,
  gecachte Version sehen (sichtbar u.a. bei der Hbf-Zusammenführung).

## v1.9.2

- "Deggendorf Hbf" und "Deggendorf Hbf 10" waren dieselbe Haltestelle (die "10" ist die
  Bussteignummer), wurden aber als zwei getrennte Haltestellen geführt, weil Linie 4s PDF
  sie ohne und Linien 1/2/3s PDFs sie mit Nummer benennen. Jetzt zusammengeführt - "Deggendorf
  Hbf" zeigt Abfahrten aller 4 Linien an einer Haltestelle. Parser normalisiert das für
  künftige Neuverarbeitungen automatisch (`Deggendorf Hbf <Nummer>` → `Deggendorf Hbf`).

## v1.9.1

- Haltestellensuche findet "Technische Hochschule" jetzt auch über die gängigen
  Abkürzungen THD, TH Deggendorf, DIT bzw. "Deggendorf Institute of Technology"
  (lib/stopAliases.ts, leicht um weitere Haltestellen erweiterbar)

## v1.9.0

- Verbindungen aufklappbar ("Details ▼"): zeigt den vollständigen Reiseplan je Etappe
  mit allen Zwischenhaltestellen (wiederverwendet die TripTimeline-Komponente aus der
  Liniendetailseite), plus Umstiegshinweis zwischen den Etappen - ähnlich der
  Reiseplan-Ansicht bei bahn.de
- lib/tripTimeline.ts: neue Funktion `timelineSegment()` schneidet den Abschnitt
  zwischen Ein- und Ausstieg aus dem vollen Fahrtverlauf heraus, mit Tests

## v1.8.0

- Verbindungsergebnisse neu gestaltet: proportionale Balkenanzeige je Fahrtabschnitt
  (Linienfarbe, gestrichelt für Umstiegs-Wartezeit) im Stil klassischer Bahn-
  Verbindungsauskünfte, statt reiner Textliste. Dauer/Umstiegszahl oben, Start-/
  Zielhaltestelle unten links/rechts ausgerichtet.

## v1.7.2

- Karte füllt jetzt die volle Fensterbreite statt der sonst auf 640px begrenzten
  Content-Spalte, und ist höher (füllt die verfügbare Fensterhöhe)

## v1.7.1

- Routenplaner überarbeitet: durchsuchbare Eingabefelder (Autocomplete, wie bei der
  Haltestellensuche) statt langer unsortierter Auswahllisten für Start/Ziel
- Formular in Card-Layout mit Tauschen-Button und hervorgehobenem Suchen-Button
  neu gestaltet

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
