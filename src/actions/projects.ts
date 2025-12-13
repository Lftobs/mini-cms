import { ActionError, defineAction } from "astro:actions";
import { db, eq, ProjectSettings, Projects } from "astro:db";
import { z } from "astro:schema";
import api from "@/lib/clients";
import { userProjects } from "@/utils/cachedFn";
import { getCurrentUser } from "./orgs";
import { ProjectService } from "@/lib/server/projects/service";
import { ProjectRepository } from "@/lib/server/projects/repository";

export const projectsActions = {
	getProjectActivity: defineAction({
		input: z.object({
			projectId: z.string(),
		}),
		handler: async ({ projectId }, context) => {
			const userId = context.locals.currentUser?.id;
			if (!userId) {
				throw new ActionError({
					code: "UNAUTHORIZED",
					message: "You must be logged in to view project activity.",
				});
			}

			try {
				const projectRepository = new ProjectRepository();
				const projectService = new ProjectService(projectRepository);
				const activity = await projectService.getProjectActivity(
					projectId,
					1,
					20,
					userId,
				);
				return activity;
			} catch (error) {
				console.error("Action handler error:", error);
				throw new ActionError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch project activity.",
				});
			}
		},
	}),

	logActivity: defineAction({
		input: z.object({
			projectId: z.string(),
			actionType: z.string(),
			filePath: z.string(),
			fileName: z.string(),
			fileSize: z.number().optional(),
			changesSummary: z.string().optional(),
		}),
		handler: async (input, context) => {
			const userId = context.locals.currentUser?.id;
			const user = context.locals.currentUser;
			if (!userId) {
				throw new ActionError({
					code: "UNAUTHORIZED",
					message: "You must be logged in to log project activity.",
				});
			}

			try {
				const projectRepository = new ProjectRepository();
				const projectService = new ProjectService(projectRepository);
				await projectService.logActivity(
					input.projectId,
					input.actionType,
					input.filePath,
					input.fileName,
					{
						name: user?.githubName || user?.username,
						email: user?.email,
					},
					{
						changesSummary: input.changesSummary,
						fileSize: input.fileSize,
					},
				);
				console.log(context.clientAddress);
				return {
					success: true,
				};
			} catch (error) {
				console.error("Action handler error:", error);
				throw new ActionError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to log project activity.",
				});
			}
		},
	}),
	submitChanges: defineAction({
		input: z.object({
			modifiedFiles: z.array(z.array(z.string())),
			projectId: z.string(),
			repo: z.string(),
			githubRepoLink: z.string(),
			commitMsg: z.string(),
		}),
		handler: async (input, context) => {
			if (!context.locals.currentUser?.id) {
				throw new ActionError({
					code: "UNAUTHORIZED",
				});
			}
			let githubName = context.locals.currentUser?.githubName ?? null;

			const files = input.modifiedFiles.map(([path, content]) => ({
				path,
				content,
			}));

			if (input.githubRepoLink && githubName === null) {
				const match = input.githubRepoLink.match(/github\.com\/([^/]+)\//);
				if (match) {
					githubName = match[1];
				}
			}

			const url = new URL(context.request.url);
			const response = await fetch(
				`${url.origin}/api/projects/${input.projectId}/repo/${githubName}/${input.repo}/bulk-update`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						files,
						message: input.commitMsg,
					}),
				},
			);

			if (!response.ok) {
				throw new ActionError({
					code: response.status === 401 || response.status === 403 ? "UNAUTHORIZED" : "BAD_REQUEST",
					message: `Failed to submit changes: ${response.status} ${response.statusText}`,
				});
			}

			let result;
			try {
				const responseText = await response.text();
				// console.log(
				// 	"Raw response:",
				// 	responseText,
				// );
				result = JSON.parse(responseText);
			} catch (parseError) {
				// console.error(
				// 	"Failed to parse response as JSON:",
				// 	parseError,
				// );
				throw new Error("Server returned invalid JSON response");
			}

			return result;
			// return "url";
		},
	}),

	createProject: defineAction({
		accept: "form",
		input: z.object({
			name: z.string(),
			description: z.string(),
			visibility: z.string(),
			repo_name: z.string(),
			github_repo_url: z.string(),
			orgs_id: z.string(),
		}),
		handler: async (input, context) => {
			const userId = await getCurrentUser(context);
			try {
				const req = await api.projects.$post({
					json: {
						name: input.name,
						description: input.description,
						visibility: input.visibility,
						repo_name: input.repo_name,
						github_repo_url: input.github_repo_url,
						orgs_id: input.orgs_id,
					},
				});

				if (req.status !== 201) {
					const res = await req.json();
					const errorMessage =
						typeof res?.error === "string"
							? res.error
							: res?.error
								? JSON.stringify(res.error)
								: "Failed to create project";
					throw new ActionError({
						code: "BAD_REQUEST",
						message: errorMessage,
					});
				}

				const res = await req.json();

				userProjects.revalidate(userId);

				return {
					success: true,
					project: res.data.project,
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
