import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Pediatric Mode",
        short_name: "Peds Mode",
        description: "Clinical decision support for junior doctors caring for children",
        theme_color: "#0E6E66",
        background_color: "#F5F8F7",
        display: "standalone",
        start_url: "/",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html}"],
      },
    }),
  ],
});
