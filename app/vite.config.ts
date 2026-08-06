import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Basis-Pfad für GitHub Pages (Repo-Name als Subpath) via Env-Var überschreibbar,
// lokal (`npm run dev`/`preview`) bleibt "/".
const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
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
            urlPattern: /\/data\/.*\.json$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "schedule-data" },
          },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
  },
});
