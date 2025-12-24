import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { projectRepoRoutes, repoRoutes } from "../repo";
import {
	createProjectHandler,
	getProjectActivityHandler,
	getProjectSettingsHandler,
	listProjectsHandler,
	updateProjectSettingsHandler,
	inviteUserHandler,
	acceptInviteHandler,
	getProjectMembersHandler,
} from "./handlers";


import { requireAuth } from "../shared/middleware";

export const projectRoutes = new Hono()
	.use("*", requireAuth)
	.get(
		"/",
		listProjectsHandler,
	)
	.post(
		"/",
		zValidator(
			"json",
			z.object({
				name: z.string(),
				description: z.string().optional(),
				repo_name: z.string(),
				github_repo_url: z.string(),
				orgs_id: z.string(),
			}),
		),
		createProjectHandler,
	)
	.get("/:projectId/settings", getProjectSettingsHandler)
	.put(
		"/:projectId/settings",
		zValidator(
			"json",
			z.object({
				public_directories: z.string(),
				allow_file_creation: z.boolean(),
				allow_file_editing: z.boolean(),
				allow_file_deletion: z.boolean(),
				require_approval: z.boolean(),
				auto_merge: z.boolean(),
				max_file_size: z.number(),
				allowed_extensions: z.string(),
				collaborator_message: z.string(),
			}),
		),
		updateProjectSettingsHandler,
	)
	.get("/:projectId/activity", getProjectActivityHandler)
	.post("/:projectId/invite", inviteUserHandler)
	.post("/invite/accept", acceptInviteHandler)
	.get("/:projectId/members", getProjectMembersHandler)
	.route("/repo", repoRoutes)
	.route("/:projectId/repo", projectRepoRoutes);

export type ProjectRoutesType = typeof projectRoutes;
