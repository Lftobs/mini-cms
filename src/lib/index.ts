import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { auth } from "./server/auth";
import { orgs } from "./server/organizations";
import { projectRoutes } from "./server/projects";

import { authMiddleware } from "./server/shared/middleware";

const app = new Hono({ strict: false }).basePath("/api");

const allowedOrigins = [import.meta.env.SITE];
if (import.meta.env.PUBLIC_APP_ENV !== 'prod') {
	allowedOrigins.push("http://localhost:4321");
}

app.use("*", cors({
	origin: allowedOrigins,
	allowHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header', 'Upgrade-Insecure-Requests'],
	allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
	exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
	maxAge: 600,
	credentials: true,
}));

app.use("*", authMiddleware);


const routes = app
	.route("/projects", projectRoutes)
	.route("/orgs", orgs)
	.route("/auth", auth)
	.get("/health", (c: Context) => c.json({ message: "Mini-cms server is healthy" }));

// serve({
//   fetch: app.fetch,
//   port: 8000,
// })

export default app;
export type AppType = typeof routes;
