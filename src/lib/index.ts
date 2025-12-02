import { Hono } from "hono";
import { cors } from "hono/cors";
// import { ws } from "./server/webhook";
import { auth } from "./server/auth";
import { orgs } from "./server/organizations";
import { posts } from "./server/posts/index";
import { projectRoutes } from "./server/projects";

const app = new Hono({ strict: false }).basePath("/api").use("/api/*", cors());

app.get("/api/hi", (c) => c.json({ message: "server is healthy" }));

const routes = app
	.route("/posts", posts)
	.route("/projects", projectRoutes)
	.route("/orgs", orgs)
	// .route("/ws", ws)
	.route("/auth", auth);

// serve({
//   fetch: app.fetch,
//   port: 8000,
// })

export default app;
export type AppType = typeof routes;

// export const client = hc("http://localhost:8000");
// export type ClientType = typeof client;
