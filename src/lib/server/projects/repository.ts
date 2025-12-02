import {
    db,
    eq,
    and,
    desc,
    Projects,
    Orgs,
    ProjectMembers,
    ProjectSettings,
    ProjectActivity,
    Invites,
    Users,
    OrgMembers,
} from "astro:db";
import { withId } from "../../../../db/utils";
import { NotFoundError, ConflictError } from "../shared/errors";

export class ProjectRepository {
    // Project CRUD
    async findById(id: string) {
        return await db.select().from(Projects).where(eq(Projects.id, id)).get();
    }

    async findByName(name: string) {
        return await db.select().from(Projects).where(eq(Projects.name, name)).get();
    }

    async createProject(data: {
        name: string;
        linked_repo_name: string;
        github_repo_link: string;
        orgs_id: string;
    }) {
        const values = withId({
            ...data,
            created_at: new Date(),
        });
        await db.insert(Projects).values(values);
        return await this.findById(values.id);
    }

    async getUserProjects(userId: string) {
        // Get projects owned by the user (via their orgs)
        const ownedProjects = await db
            .select({
                id: Projects.id,
                name: Projects.name,
                description: Projects.description,
                visibility: Projects.visibility,
                linked_repo_name: Projects.linked_repo_name,
                github_repo_link: Projects.github_repo_link,
                created_at: Projects.created_at,
                org_name: Orgs.name,
                org_id: Orgs.id,
            })
            .from(Projects)
            .innerJoin(Orgs, eq(Projects.orgs_id, Orgs.id))
            .where(eq(Orgs.owner, userId))
            .all();

        const ownedWithRole = ownedProjects.map((p) => ({ ...p, role: "owner" }));

        // Get projects where the user is a member
        const memberProjects = await db
            .select({
                id: Projects.id,
                name: Projects.name,
                description: Projects.description,
                visibility: Projects.visibility,
                linked_repo_name: Projects.linked_repo_name,
                github_repo_link: Projects.github_repo_link,
                created_at: Projects.created_at,
                org_name: Orgs.name,
                org_id: Orgs.id,
                role: ProjectMembers.role,
            })
            .from(Projects)
            .innerJoin(Orgs, eq(Projects.orgs_id, Orgs.id))
            .innerJoin(ProjectMembers, eq(Projects.id, ProjectMembers.projectId))
            .where(eq(ProjectMembers.userId, userId))
            .all();

        return [...ownedWithRole, ...memberProjects];
    }

    // Project Settings
    async getSettings(projectId: string) {
        return await db
            .select()
            .from(ProjectSettings)
            .where(eq(ProjectSettings.project_id, projectId))
            .get();
    }

    async upsertSettings(projectId: string, settings: any) {
        const existing = await this.getSettings(projectId);
        const now = new Date();

        if (existing) {
            await db
                .update(ProjectSettings)
                .set({ ...settings, updated_at: now })
                .where(eq(ProjectSettings.project_id, projectId));
        } else {
            await db.insert(ProjectSettings).values({
                project_id: projectId,
                ...settings,
                created_at: now,
            });
        }
        return await this.getSettings(projectId);
    }

    // Activity
    async getActivity(projectId: string, limit: number, offset: number) {
        return await db
            .select()
            .from(ProjectActivity)
            .where(eq(ProjectActivity.project_id, projectId))
            .orderBy(desc(ProjectActivity.created_at))
            .limit(limit)
            .offset(offset)
            .all();
    }

    async logActivity(data: {
        project_id: string;
        action_type: string;
        file_path: string;
        file_name: string;
        contributor_name?: string;
        contributor_email?: string;
        contributor_ip?: string;
        changes_summary?: string;
        content_preview?: string;
        pr_number?: number;
        pr_status?: string;
        file_size?: number;
    }) {
        await db.insert(ProjectActivity).values(data);
    }

    // Invites & Members
    async findMember(projectId: string, userId: string) {
        return await db
            .select()
            .from(ProjectMembers)
            .where(
                and(
                    eq(ProjectMembers.projectId, projectId),
                    eq(ProjectMembers.userId, userId)
                )
            )
            .get();
    }

    async findMemberByEmail(projectId: string, email: string) {
        return await db
            .select()
            .from(ProjectMembers)
            .innerJoin(Users, eq(ProjectMembers.userId, Users.id))
            .where(
                and(eq(ProjectMembers.projectId, projectId), eq(Users.email, email))
            )
            .get();
    }

    async createInvite(data: {
        projectId: string;
        email: string;
        role: string;
        token: string;
        expiresAt: Date;
    }) {
        await db.insert(Invites).values(
            withId({
                ...data,
                status: "pending",
                createdAt: new Date(),
            })
        );
    }

    async findInviteByToken(token: string) {
        return await db.select().from(Invites).where(eq(Invites.token, token)).get();
    }

    async findPendingInvite(projectId: string, email: string) {
        return await db
            .select()
            .from(Invites)
            .where(
                and(
                    eq(Invites.projectId, projectId),
                    eq(Invites.email, email),
                    eq(Invites.status, "pending")
                )
            )
            .get();
    }

    async updateInviteStatus(id: string, status: string) {
        await db.update(Invites).set({ status }).where(eq(Invites.id, id));
    }

    async addOrgMember(orgId: string, userId: string, role: string) {
        await db.insert(OrgMembers).values(
            withId({
                org_id: orgId,
                user_id: userId,
                role,
                joined_at: new Date(),
            })
        );
    }

    async findOrgMember(orgId: string, userId: string) {
        return await db
            .select()
            .from(OrgMembers)
            .where(
                and(
                    eq(OrgMembers.org_id, orgId),
                    eq(OrgMembers.user_id, userId)
                )
            )
            .get();
    }

    async getProjectMembers(projectId: string) {
        return await db
            .select({
                id: ProjectMembers.id,
                userId: Users.id,
                username: Users.username,
                email: Users.email,
                pfp: Users.pfp,
                role: ProjectMembers.role,
                joinedAt: ProjectMembers.createdAt,
            })
            .from(ProjectMembers)
            .innerJoin(Users, eq(ProjectMembers.userId, Users.id))
            .where(eq(ProjectMembers.projectId, projectId))
            .all();
    }

    async getPendingInvites(projectId: string) {
        return await db
            .select()
            .from(Invites)
            .where(and(eq(Invites.projectId, projectId), eq(Invites.status, "pending")))
            .all();
    }

    async addProjectMember(projectId: string, userId: string, role: string) {
        await db.insert(ProjectMembers).values(
            withId({
                projectId,
                userId,
                role,
                createdAt: new Date(),
            })
        );
    }

    async getProjectWithOrg(projectId: string) {
        return await db
            .select({
                id: Projects.id,
                name: Projects.name,
                orgId: Projects.orgs_id,
                orgName: Orgs.name,
                owner: Orgs.owner,
                linkedRepoName: Projects.linked_repo_name,
                githubRepoLink: Projects.github_repo_link,
            })
            .from(Projects)
            .innerJoin(Orgs, eq(Projects.orgs_id, Orgs.id))
            .where(eq(Projects.id, projectId))
            .get();
    }
}
