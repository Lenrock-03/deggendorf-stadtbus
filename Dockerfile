# Baut die Datenpipeline + App und serviert das Ergebnis über nginx.
FROM node:20-alpine AS builder

WORKDIR /src

COPY data-pipeline/package*.json data-pipeline/
RUN npm ci --prefix data-pipeline

COPY data-pipeline data-pipeline
RUN npm run build --prefix data-pipeline

COPY app/package*.json app/
RUN npm ci --prefix app

COPY app app
# app/public/data wurde gerade von der Pipeline befüllt (s.o.) - vor dem App-Build vorhanden
ARG VITE_BASE_PATH=/
RUN VITE_BASE_PATH=$VITE_BASE_PATH npm run build --prefix app

FROM nginx:1.27-alpine
COPY --from=builder /src/app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
