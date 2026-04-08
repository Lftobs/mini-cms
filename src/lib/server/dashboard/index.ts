import { Hono } from "hono";
import {
	getDashboardStatsHandler,
	getDashboardProjectsHandler,
	getDashboardActivitiesHandler
} from "./handlers";
import { requireAuth } from "../shared/middleware";

export const dashboardRoutes = new Hono()
	.use("*", requireAuth)
	.get("/stats", getDashboardStatsHandler)
	.get("/projects", getDashboardProjectsHandler)
	.get("/activities", getDashboardActivitiesHandler);
