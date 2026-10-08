# Baut das GTFS (gleicher Datenstand wie app/api, siehe data-pipeline/src/gtfsExport.ts) und
# startet die Motis-Routing-Engine (statische Release-Binary, kein Build aus Quellcode nötig)
# mit dem committeten OSM-Ausschnitt (motis/osm/deggendorf.osm.pbf, siehe motis/README.md für
# die Gewinnung) + dem frisch gebauten GTFS.
#
# WICHTIG: Build-Context muss das Repo-Root sein (siehe docker-compose.yml), analog zu
# api/Dockerfile - sonst kommt data-pipeline/ nicht in den Build-Context.
FROM node:20-alpine AS gtfs-builder
WORKDIR /src
COPY data-pipeline/package*.json data-pipeline/
RUN npm ci --prefix data-pipeline
COPY data-pipeline data-pipeline
RUN npm run build:gtfs --prefix data-pipeline
# -> /src/data-pipeline/gtfs-out/gtfs.zip

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl bzip2 \
    && rm -rf /var/lib/apt/lists/*

# Gepinnte statische Release-Binary (siehe https://github.com/motis-project/motis/releases) -
# bei Upgrade bewusst diese Version anheben, nicht automatisch "latest" ziehen.
ARG MOTIS_VERSION=v2.11.3
WORKDIR /motis
RUN curl -sSL -o motis.tar.bz2 \
      "https://github.com/motis-project/motis/releases/download/${MOTIS_VERSION}/motis-linux-amd64.tar.bz2" \
    && tar xjf motis.tar.bz2 && rm motis.tar.bz2

COPY motis/osm/deggendorf.osm.pbf ./deggendorf.osm.pbf
COPY --from=gtfs-builder /src/data-pipeline/gtfs-out/gtfs.zip ./gtfs.zip

# Datensatz ist winzig (4 Linien, ~100 Haltestellen, ~6.5MB OSM-Ausschnitt) - Import dauert
# Sekunden, daher beim Image-Build gebacken statt erst beim Container-Start (gleiches Prinzip
# wie app/api, die ihre Daten auch beim Build statt zur Laufzeit erzeugen).
RUN ./motis config deggendorf.osm.pbf gtfs.zip && ./motis import

EXPOSE 8080
CMD ["./motis", "server"]
