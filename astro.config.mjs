// import tailwindcss from "@tailwindcss/vite";

import alpinejs from "@astrojs/alpinejs";
import db from "@astrojs/db";
import node from "@astrojs/node";
import react from "@astrojs/react";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
// import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
	output: "server",
	prefetch: {
		prefetchAll: true,
	},
	integrations: [
		db(),
		react(),
		svelte(),
		alpinejs({
			entrypoint: "/src/entrypoint",
		}),
		// tailwind(),
	],
	adapter: node({
		mode: "standalone",
	}),
	vite: {
		server: {
			host: true, // Allow external connections
			allowedHosts: [
				"19fe-102-89-22-228.ngrok-free.app",
				"15c22f38fda5.ngrok-free.app",
				"*",
			],
		},

		ssr: {
			noExternal: ["three", "svelte-cubed"],
		},

		plugins: [tailwindcss()],
	},
	experimental: {
		svg: true,
	},
});
