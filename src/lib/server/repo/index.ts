import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
	bulkUpdateFilesHandler,
	createFileHandler,
	getDirectoryContentsHandler,
	getFileContentHandler,
	getRepoConfigHandler,
	listReposHandler,
} from "./handlers";

import { requireAuth } from "../shared/middleware";

export const repoRoutes = new Hono()
	.use("*", requireAuth)
	.get(
		"/integrate/repos",
		zValidator(
			"query",
			z.object({
				projectId: z.string(),
				orgInstallationId: z.string(),
			}),
		),
		listReposHandler,
	);

export const projectRepoRoutes = new Hono()
	.use("*", requireAuth)
	.get(
		"/:owner/:repo/contents",
		zValidator(
			"query",
			z.object({
				path: z.string().optional(),
			}),
		),
		getDirectoryContentsHandler,
	)
	.get("/:owner/:repo/config", getRepoConfigHandler)
	.get("/:owner/:repo/file", getFileContentHandler)
	.post(
		"/:owner/:repo/create-file",
		zValidator(
			"json",
			z.object({
				path: z.string(),
				content: z.string(),
				message: z.string(),
			})
		),
		createFileHandler
	)
	.post("/:owner/:repo/bulk-update", bulkUpdateFilesHandler);

export type repoRoutesType = typeof repoRoutes;
export type projectRepoRoutesType = typeof projectRepoRoutes;
