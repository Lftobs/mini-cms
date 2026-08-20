import type { APIRoute } from "astro";
import jwt from "jsonwebtoken";
import { config } from "../../../lib/server/shared/config";

export const ALL: APIRoute = async (context) => {
	const accessToken = context.cookies.get("access_token")?.value;
	if (!accessToken) return new Response("Unauthorized", { status: 401 });

	try {
		jwt.verify(accessToken, config.auth.jwt.secret);
	} catch {
		return new Response("Unauthorized", { status: 401 });
	}

	const env = context.locals.runtime?.env;
	const collab = env?.COLLAB as
		| { idFromName(name: string): unknown; get(id: unknown): { fetch(req: Request): Promise<Response> } }
		| undefined;
	if (!collab) return new Response("Collaboration unavailable", { status: 503 });

	const room = String(context.params.room ?? "default");
	const id = collab.idFromName(room);
	const stub = collab.get(id);

	return stub.fetch(context.request);
};
