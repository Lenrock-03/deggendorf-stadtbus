# Läuft direkt mit tsx statt eines separaten Kompilierschritts - kleiner interner Service,
# analog zur tsx-first-Konvention von data-pipeline/.
FROM node:20-alpine

WORKDIR /src
COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx
COPY src src

EXPOSE 3000
CMD ["npx", "tsx", "src/server.ts"]
