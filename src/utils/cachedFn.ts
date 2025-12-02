import api from "../lib/clients";
import { createCachedFetcher } from "./cache";

export const userProjects = createCachedFetcher(
	"userProjects",
	async (userId: string) => {
		const response = await api.projects.$get({
			query: { userId: userId },
		});
		if (!response.ok) throw new Error("Failed to fetch user");
		return response.json();
	},
);

export const userOrgs = createCachedFetcher("userOrgs", async (userId) => {
	const response = await api.orgs.$get({
		query: { userId: userId },
	});
	if (!response.ok) throw new Error("Failed to fetch user");
	return response.json();
});
