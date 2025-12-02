import type { APIRoute } from "astro";
import app from "../../lib";

export const ALL: APIRoute = (context) => app.fetch(context.request);
export type App = typeof app;
