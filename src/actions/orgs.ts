import { ActionError, defineAction } from "astro:actions";
import { db, eq, ProjectSettings, Projects } from "astro:db";
import { z } from "astro:schema";
import type { ActionAPIContext } from "astro/actions/runtime/utils.js";
import api from "../lib/clients";
import { userOrgs } from "../utils/cachedFn";

export const getCurrentUser = async (context: ActionAPIContext) => {
	const userId = context.locals.currentUser?.id ?? null;
	if (!userId) {
		throw new ActionError({
			code: "UNAUTHORIZED",
			message: "User is not authenticated",
		});
	}
	return userId;
};

export const orgsActions = {
	getOrgs: defineAction({
		handler: async (_, context) => {
			const userId = await getCurrentUser(context);
			try {
				const orgs = await userOrgs.fetch(userId);

				if (!("data" in orgs)) {
					throw new ActionError({
						code: "NOT_FOUND",
						message: "No organizations found",
					}); // rare scenerio, but possible
				}
				const data = orgs?.data;

				return data;
			} catch (error) {
				console.error(error);
				throw new ActionError({
					code: "INTERNAL_SERVER_ERROR",
					message: (error as string) || "Unknown error",
				});
			}
		},
	}),
	createOrg: defineAction({
		accept: "form",
		input: z.object({
			name: z.string(),
			description: z.string(),
		}),
		handler: async ({ name, description }, context) => {
			const userId = await getCurrentUser(context);
			try {
				const req = await api.orgs.$post({
					json: {
						name,
						description,
						userId: userId,
					},
				});

				userOrgs.revalidate(String(userId));

				if (req.status !== 201) {
					const res = await req.json();
					const errorMessage =
						typeof res?.error === "string"
							? res.error
							: res?.error
								? JSON.stringify(res.error)
								: "Failed to create organization";
					throw new ActionError({
						code: "BAD_REQUEST",
						message: errorMessage,
					});
				}

				const res = await req.json();

				return {
					success: true,
					redirect: res.data.redirect,
					orgId: res.data.orgId,
				};
			} catch (error) {
				console.error("Action handler error:", error);
				const errorMessage =
					error instanceof Error
						? error.message
						: typeof error === "string"
							? error
							: typeof error === "object"
								? JSON.stringify(error)
								: "Unknown error occurred";
				throw new ActionError({
					code: "INTERNAL_SERVER_ERROR",
					message: errorMessage,
				});
			}
		},
	}),
	addInstallationId: defineAction({
		input: z.object({
			orgId: z.string(),
			installationId: z.string(),
		}),
		handler: async ({ orgId, installationId }, context) => {
			const userId = await getCurrentUser(context);
			try {
				const { OrganizationService } = await import(
					"../lib/server/organizations/service"
				);
				const { OrganizationRepository } = await import(
					"../lib/server/organizations/repository"
				);

				const orgService = new OrganizationService(new OrganizationRepository());

				await orgService.addInstallationId(
					orgId,
					installationId,
					userId,
				);
				const updatedOrg = await orgService.getOrgById(orgId);

				userOrgs.revalidate(userId);

				return {
					success: true,
					org: updatedOrg,
				};
			} catch (error) {
				console.error("Action handler error:", error);
				const errorMessage =
					error instanceof Error
						? error.message
						: typeof error === "string"
							? error
							: typeof error === "object"
								? JSON.stringify(error)
								: "Unknown error occurred";
				throw new ActionError({
					code: "INTERNAL_SERVER_ERROR",
					message: errorMessage,
				});
			}
		},
	}),
};
