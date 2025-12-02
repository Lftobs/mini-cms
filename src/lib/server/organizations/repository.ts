import { db, eq, and, Orgs, OrgMembers } from "astro:db";
import { withId } from "../../../../db/utils";
import { NotFoundError, ConflictError } from "../shared/errors";

export class OrganizationRepository {

    async findByName(name: string) {
        return await db.select().from(Orgs).where(eq(Orgs.name, name)).get();
    }

    async findById(id: string) {
        return await db.select().from(Orgs).where(eq(Orgs.id, id)).get();
    }

    async getUserOrgs(userId: string) {
        // Get owned orgs
        const ownedOrgs = await db
            .select()
            .from(Orgs)
            .where(eq(Orgs.owner, userId))
            .all();

        // Get member orgs
        const memberOrgs = await db
            .select({
                id: Orgs.id,
                name: Orgs.name,
                description: Orgs.description,
                owner: Orgs.owner,
                orgs_pfp: Orgs.orgs_pfp,
                installationId: Orgs.installationId,
                created_at: Orgs.created_at,
            })
            .from(Orgs)
            .innerJoin(OrgMembers, eq(Orgs.id, OrgMembers.org_id))
            .where(eq(OrgMembers.user_id, userId))
            .all();

        // Combine and deduplicate
        const allOrgs = [...ownedOrgs, ...memberOrgs];
        return Array.from(new Map(allOrgs.map((item) => [item.id, item])).values());
    }

    async createOrg(data: {
        name: string;
        description: string;
        owner: string;
        installationId?: string;
    }) {
        const existingOrg = await this.findByName(data.name);
        if (existingOrg) {
            throw new ConflictError("Organization with this name already exists");
        }

        const values = withId({
            ...data,
            created_at: new Date(),
        });
        await db.insert(Orgs).values(values);
        return await this.findById(values.id);
    }

    async updateOrg(
        orgId: string,
        updates: { name?: string; description?: string; installationId?: string }
    ) {
        const org = await this.findById(orgId);
        if (!org) throw new NotFoundError("Organization");

        await db
            .update(Orgs)
            .set({
                ...updates,
                updated_at: new Date(),
            } as any)
            .where(eq(Orgs.id, orgId));

        return await this.findById(orgId);
    }

    async addInstallationId(orgId: string, installationId: string, userId: string) {
        const org = await this.findById(orgId);
        if (!org) throw new NotFoundError("Organization");

        // Only update if not already set or if owner matches
        if (org.installationId) return org;

        await db
            .update(Orgs)
            .set({ installationId } as any)
            .where(and(eq(Orgs.id, orgId), eq(Orgs.owner, userId)));

        return await this.findById(orgId);
    }
}
