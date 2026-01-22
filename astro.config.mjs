import alpinejs from "@astrojs/alpinejs";
import db from "@astrojs/db";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
// import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://mini-cms.xyz",
  output: "server",
  prefetch: {
    prefetchAll: true,
  },
  integrations: [
    db(),
    react(),
    alpinejs({
      entrypoint: "/src/entrypoint",
    }),
    sitemap(),
  ],
  // adapter: node({
  //     mode: "standalone",
  // }),
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
  }),
  vite: {
    server: {
      host: true,
      allowedHosts: ["mini-cms.xyz", "mini-cms-psi.vercel.app"],
    },

    plugins: [tailwindcss()],
  },
  experimental: {
    svgo: true,
  },
});
