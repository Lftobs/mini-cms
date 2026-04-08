import api from "../lib/clients";
import { createCachedFetcher, createSWRFetcher } from "./cache";

// Server-side cached fetchers (Redis-backed)
export const userProjects = createCachedFetcher(
	"userProjects",
	async (userId: string) => {
		try {
			const response = await api.projects.$get({
				query: { userId: userId },
			});
			if (response.status === 404) return { data: [] };
			if (!response.ok) throw new Error("Failed to fetch projects");
			return response.json();
		} catch (error) {
			console.error("[Fetcher] Error fetching projects:", error);
			return { data: [] };
		}
	},
);

export const userOrgs = createCachedFetcher(
	"userOrgs",
	async (userId: string) => {
		try {
			const response = await api.orgs.$get({
				query: { userId: userId },
			});
			if (response.status === 404) return { data: [] };
			if (!response.ok) throw new Error("Failed to fetch organizations");
			return response.json();
		} catch (error) {
			console.error("[Fetcher] Error fetching organizations:", error);
			return { data: [] };
		}
	},
);

// Client-side SWR fetchers (memory-backed with stale-while-revalidate)
export const userProjectsSWR = createSWRFetcher({
	key: "user-projects-swr",
	fetcher: async (userId: string) => {
		try {
			const response = await api.projects.$get({
				query: { userId: userId },
			});
			if (response.status === 404) return { data: [] };
			if (!response.ok) throw new Error("Failed to fetch projects");
			return response.json();
		} catch (error) {
			console.error("[SWR] Error fetching projects:", error);
			return { data: [] };
		}
	},
	maxAge: 30000, // 30 seconds fresh
	staleTime: 300000, // 5 minutes stale
});

export const userOrgsSWR = createSWRFetcher({
	key: "user-orgs-swr",
	fetcher: async (userId: string) => {
		try {
			const response = await api.orgs.$get({
				query: { userId: userId },
			});
			if (response.status === 404) return { data: [] };
			if (!response.ok) throw new Error("Failed to fetch organizations");
			return response.json();
		} catch (error) {
			console.error("[SWR] Error fetching organizations:", error);
			return { data: [] };
		}
	},
	maxAge: 60000, // 1 minute fresh
	staleTime: 600000, // 10 minutes stale
});