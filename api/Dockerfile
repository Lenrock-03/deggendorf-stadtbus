# Baut zuerst die Datenpipeline (gleicher Builder-Schritt wie im Root-Dockerfile für app/),
# damit api/ unabhängig vom app-Image mit einem eigenen, aktuellen Fahrplan-Datenstand
# starten kann. Läuft danach direkt mit tsx statt eines separaten Kompilierschritts -
# kleiner interner Service, analog zur tsx-first-Konvention von data-pipeline/.
#
# WICHTIG: Build-Context muss das Repo-Root sein (siehe docker-compose.yml), nicht api/
# selbst - sonst kommt data-pipeline/ nicht in den Build-Context.
FROM node:20-alpine AS builder
WORKDIR /src
COPY data-pipeline/package*.json data-pipeline/
RUN npm ci --prefix data-pipeline
COPY data-pipeline data-pipeline
RUN npm run build --prefix data-pipeline
# schreibt nach /src/app/public/data/*.json (Pfad ist in buildBundle.ts fest verdrahtet)

FROM node:20-alpine
WORKDIR /src
COPY api/package*.json ./
RUN npm ci --omit=dev && npm install tsx
COPY api/src src
COPY --from=builder /src/app/public/data ./data
ENV DATA_DIR=/src/data

EXPOSE 3000
CMD ["npx", "tsx", "src/server.ts"]
