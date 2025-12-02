import { db, eq, Orgs, Projects, Users } from "astro:db";
import { NotFoundError } from "../shared/errors";

export class RepoRepository {
    async findUserByGithubName(username: string) {
        return await db
            .select()
            .from(Users)
            .where(eq(Users.githubName, username))
            .get();
    }

    async updateOrgInstallationId(userId: string, installationId: string) {
        await db
            .update(Orgs)
            .set({
                installationId: installationId,
            })
            .where(eq(Orgs.owner, userId))
            .execute();
    }

    async findProjectById(projectId: string) {
        return await db
            .select()
            .from(Projects)
            .where(eq(Projects.id, projectId))
            .get();
    }

    async findOrgById(orgId: string) {
        return await db
            .select()
            .from(Orgs)
            .where(eq(Orgs.id, orgId))
            .get();
    }
}
