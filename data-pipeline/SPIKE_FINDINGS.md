# M0 – Datenspike: Ergebnis (2026-08-06)

## Entscheidung: **PDF-Fallback für alle 4 Linien** (gtfs.de deckt Stadtbus Deggendorf nicht korrekt ab)

## Vorgehen
1. gtfs.de-Feed `de_nv` (Nahverkehr, https://download.gtfs.de/germany/nv_free/latest.zip, Stand 01.08.2026) geladen und entpackt.
2. `agency.txt` nach "Artmeier" durchsucht → **kein Treffer**.
3. `stops.txt` nach Deggendorf-Haltestellen durchsucht → viele Treffer, u.a. echte Stadtbus-Haltepunkte wie "Deggendorf, Klinikum", "Deggendorf, Luitpoldplatz Ost/West", "Deggendorf, Stadthallen", "Deggendorf, Egger/Martinskirche" – diese Stationen existieren im Feed.
4. Trips, die diese Haltestellen bedienen, zu `routes.txt`/`agency.txt` zurückverfolgt: bedient werden sie von **Regionalbus Ostbayern (agency_id 8)** und **ZV VLD (agency_id 340)** mit eigenen (4-stelligen) internen Liniennummern (z.B. 6144, 8107, 8108) – nicht von einer "Artmeier"-Agency.
5. Offizielle PDF-Fahrpläne aller 4 Linien von deggendorf.de geladen (Ground Truth) und mit den gefundenen GTFS-Trips abgeglichen: **Abfahrtszeiten stimmen nicht überein** (Beispiel: Linie 4 hat laut PDF "Deggendorf, Klinikum" exakt um 09:30/11:30/14:30/16:30 – die einzigen im gtfs.de-Feed gefundenen Trips an dieser Haltestelle fahren um 13:22/14:22 bzw. sind als "Bedarfsverkehr" (Anruf-Sammeltaxi, pickup_type=2) markiert).
6. Fazit: gtfs.de/DELFI enthält für Deggendorf zwar Nahverkehr (RBO-Regionallinien, die z.T. auch innerstädtische Haltestellen bedienen, sowie das Anruf-Sammeltaxi), aber **nicht den eigentlichen, von Artmeier Bus GmbH & Co. KG betriebenen Stadtbus Deggendorf (Linien 1–4)** mit seinem echten Fahrplan. Das bestätigt exakt das ursprüngliche Problem des Nutzers.

## Konsequenz für die Pipeline
Alle 4 Linien werden manuell aus den offiziellen PDF-Fahrplänen (`fallback-data/source-pdfs/linie-{1,2,3,4}.pdf`, gültig ab 01.01.2025 bzw. 01.01.2024 für Linie 4) in GTFS-Schema-Dateien unter `fallback-data/` übertragen. gtfs.de bleibt als mögliche künftige Quelle für RBO/VLD-Regionallinien oder DB-Züge im Blick, ist aber für v1 (nur Stadtbus) nicht relevant.

## Eckdaten der 4 Linien (aus den PDFs)
| Linie | Route | Gültig ab | Verkehrstage | Besonderheiten |
|---|---|---|---|---|
| 1 | Himmelreich – Stammstrecke – Scheuering – zurück | 01.01.2025 | Mo–Fr (halbstündlich ca. 06:52–19:01) + Sa | großer Ringschluss, ~52 Haltestellen/Runde |
| 2 | Hirzau – Stammstrecke – Rörerstraße – zurück | 01.01.2025 | Mo–Fr + Sa | einzelne Haltestellen nur an Schultagen ("S"/"*S"), einzelne nur bedarfsweise zum Aussteigen ("AB") |
| 3 | Aletsberg – Stammstrecke – Mietraching – zurück | 01.01.2025 | Mo–Fr (stündlich 08:12–19:05) + Sa | ~58 Haltestellen/Runde |
| 4 | Zentrum – Deggenau – Stammstrecke – Klinikum – Zentrum – Stadt-Au – Zentrum | 01.01.2024 | Mo–Fr (4x: 08:49/10:49/13:49/15:49) + Sa (2x: 08:49/10:49) | einfachste Linie, guter Pilot für M1/M2 |

Gemeinsame Regel aller 4 Linien: kein Verkehr an Sonn-/Feiertagen; an Heiligabend/Silvester wie Samstag (außer wenn diese auf einen Sonntag fallen).

## Nächster Schritt
Linie 4 als Pilotlinie für M1 (Pipeline v0) und M2 (Kernlogik v0) transkribieren – kleinster/einfachster Datensatz, keine Schultage-Sonderfälle. Linien 1–3 folgen in M3.
