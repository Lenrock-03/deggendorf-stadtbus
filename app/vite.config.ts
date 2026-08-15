import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Basis-Pfad für GitHub Pages (Repo-Name als Subpath) via Env-Var überschreibbar,
// lokal (`npm run dev`/`preview`) bleibt "/". Für den Capacitor-Build (VITE_CAPACITOR=1)
// immer "/" - die App läuft dort aus einem lokal gebündelten Root, kein Subpath-Hosting.
const isCapacitor = process.env.VITE_CAPACITOR === "1";
const base = isCapacitor ? "/" : (process.env.VITE_BASE_PATH ?? "/");

// PWA-Plugin (Service Worker + Web-Manifest) nur für den Web-Build. In der
// Capacitor-WebView ist beides witzlos bis kontraproduktiv: es gibt keinen
// Browser-Install-Prompt, und ein SW gegen "https://localhost" registriert würde mit
// Capacitors eigenem lokalem Asset-Loading konkurrieren. Offline-Fähigkeit bekommt die
// native App stattdessen automatisch dadurch, dass der komplette dist/-Ordner (inkl.
// data/*.json) direkt in die APK gebündelt wird.
const pwaPlugin = VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.svg"],
  manifest: {
    name: "Deggendorf Busfahrplan",
    short_name: "Busfahrplan DEG",
    description: "Fahrplan für den Stadtbus Deggendorf (Linien 1-4)",
    lang: "de",
    start_url: base,
    scope: base,
    display: "standalone",
    theme_color: "#1d4ed8",
    background_color: "#ffffff",
    icons: [
      { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
    runtimeCaching: [
      {
        // Fahrplandaten sind sicherheitsrelevant (falsche Zeiten irritieren echte
        // Fahrgäste) - NetworkFirst statt StaleWhileRevalidate, damit online immer
        // die aktuelle Version geladen wird. Der Cache dient nur als Fallback, wenn
        // gar keine Verbindung besteht (kein Bruch mit dem bewusst nicht gebauten
        // "garantierten Offline-Modus" - reiner Nebeneffekt der Installierbarkeit).
        urlPattern: /\/data\/.*\.json$/,
        handler: "NetworkFirst",
        options: { cacheName: "schedule-data", networkTimeoutSeconds: 4 },
      },
    ],
  },
});

export default defineConfig({
  base,
  plugins: [react(), ...(isCapacitor ? [] : [pwaPlugin])],
  test: {
    environment: "node",
  },
});
