import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // GitHub Pages sirve la app en /Biblioteca/; Netlify en la raíz (BASE_PATH=/).
  base: process.env.BASE_PATH ?? "/Biblioteca/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Biblioteca",
        short_name: "Biblioteca",
        description: "Mi archivo de películas, series, juegos y libros",
        theme_color: "#0a0a0b",
        background_color: "#0a0a0b",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          { urlPattern: /\/data\/.*\.json$/, handler: "StaleWhileRevalidate", options: { cacheName: "datos" } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//, handler: "CacheFirst", options: { cacheName: "fuentes" } },
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
