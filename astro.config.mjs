import alpinejs from "@astrojs/alpinejs";
import db from "@astrojs/db";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";


// https://astro.build/config
export default defineConfig({
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

	],
	// adapter: node({
	// 	mode: "standalone",
	// }),
	adapter: vercel({
		webAnalytics: {
			enabled: true,
		},
	}),
	vite: {
		server: {
			host: true,
			allowedHosts: ["*"],
		},

		plugins: [tailwindcss()],
	},
	experimental: {
		svg: true,
	},
});
