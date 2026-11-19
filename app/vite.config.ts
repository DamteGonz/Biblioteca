import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/Biblioteca/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Biblioteca",
        short_name: "Biblioteca",
        description: "Mi archivo de películas, series, juegos y libros",
        theme_color: "#0f1115",
        background_color: "#0f1115",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        runtimeCaching: [
          { urlPattern: /\/data\/.*\.json$/, handler: "StaleWhileRevalidate", options: { cacheName: "datos" } },
          {
            urlPattern: /^https:\/\/(image\.tmdb\.org|images\.igdb\.com|covers\.openlibrary\.org)\//,
            handler: "CacheFirst",
            options: { cacheName: "portadas", expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 180 } },
          },
        ],
      },
    }),
  ],
});
