import alpinejs from "@astrojs/alpinejs";
import cloudflare from "@astrojs/cloudflare";
import db from "@astrojs/db";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
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
    db({
      mode: "web",
    }),
    react(),
    alpinejs({
      entrypoint: "/src/entrypoint",
    }),
    sitemap(),
  ],
  // adapter: node({
  //     mode: "standalone",
  // }),
  adapter: cloudflare({
    workerEntryPoint: {
      path: "src/worker.ts",
      namedExports: ["CollabRoom"],
    },
  }),
  vite: {
    build: {
      minify: false,
    },
    server: {
      host: true,
      allowedHosts: ["mini-cms.xyz", "localhost"],
    },

    plugins: [tailwindcss()],
  },
  experimental: {
    svgo: true,
  },
});
