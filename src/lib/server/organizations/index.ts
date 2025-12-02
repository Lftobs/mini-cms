import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { createOrgHandler, getAllOrgsHandler } from "./handlers";

export const orgs = new Hono()
	.get(
		"/",
		zValidator(
			"query",
			z.object({
				userId: z.string(),
			}),
		),
		getAllOrgsHandler,
	)
	.post(
		"/",
		zValidator(
			"json",
			z.object({
				name: z.string(),
				description: z.string(),
				userId: z.string(),
			}),
		),
		createOrgHandler,
	);

export type orgsType = typeof orgs;
