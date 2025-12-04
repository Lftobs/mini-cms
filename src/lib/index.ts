import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { auth } from "./server/auth";
import { orgs } from "./server/organizations";
import { projectRoutes } from "./server/projects";

const app = new Hono({ strict: false }).basePath("/api").use("/api/*", cors());

app.get("/hi", (c) => c.json({ message: "server is healthy" }));

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

// export const client = hc("http://localhost:8000");
// export type ClientType = typeof client;
