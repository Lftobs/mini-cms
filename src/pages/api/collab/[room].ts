import type { APIRoute } from "astro";
import { config } from "../../../lib/server/shared/config";
import { AuthService } from "../../../lib/server/auth/service";
import { AuthRepository } from "../../../lib/server/auth/repository";
import { OrganizationService } from "../../../lib/server/organizations/service";
import { OrganizationRepository } from "../../../lib/server/organizations/repository";
import { ProjectService } from "../../../lib/server/projects/service";
import { ProjectRepository } from "../../../lib/server/projects/repository";

export const ALL: APIRoute = async (context) => {
	const accessToken = context.cookies.get("access_token")?.value;
	if (!accessToken) return new Response("Unauthorized", { status: 401 });

    const authRepo = new AuthRepository();
    const orgRepo = new OrganizationRepository();
    const orgService = new OrganizationService(orgRepo);
    const authService = new AuthService(authRepo, orgService);

    let userId: string;
	try {
		const payload = await authService.verifyAccessToken(accessToken);
        userId = payload.id;
	} catch {
		return new Response("Unauthorized", { status: 401 });
	}

	const env = context.locals.runtime?.env;
	const collab = env?.COLLAB as
		| { idFromName(name: string): unknown; get(id: unknown): { fetch(req: Request): Promise<Response> } }
		| undefined;
	if (!collab) return new Response("Collaboration unavailable", { status: 503 });

	const room = String(context.params.room ?? "default");

    try {
        const projectRepo = new ProjectRepository();
        const projectService = new ProjectService(projectRepo);
        // Ensure user is authorized to access the project mapped to this room
        await projectService.checkProjectAccess(room, userId);
    } catch (e) {
        return new Response("Forbidden or Project Not Found", { status: 403 });
    }

	const id = collab.idFromName(room);
	const stub = collab.get(id);

	return stub.fetch(context.request);
};
