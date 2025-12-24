import api from "../lib/clients";
import { createCachedFetcher } from "./cache";

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