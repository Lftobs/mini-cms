import alpinejs from "@astrojs/alpinejs";
import db from "@astrojs/db";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";


// https://astro.build/config
export default defineConfig({
	site: import.meta.env.PUBLIC_APP_ENV === "prod" ? "https://mini-cms-psi.vercel.app" : "http://localhost:4321",
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
			allowedHosts: ["mini-cms-psi.vercel.app"],
		},

		plugins: [tailwindcss()],
	},
	experimental: {
		svgo: true,
	},
});
