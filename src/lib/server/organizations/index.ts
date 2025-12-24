import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { createOrgHandler, getAllOrgsHandler } from "./handlers";
import { requireAuth } from "../shared/middleware";

export const orgs = new Hono()
	.use("*", requireAuth)
	.get(
		"/",
		getAllOrgsHandler,
	)
	.post(
		"/",
		zValidator(
			"json",
			z.object({
				name: z.string(),
				description: z.string(),
			}),
		),
		createOrgHandler,
	);

export type orgsType = typeof orgs;
