import { OrganizationRepository } from "./repository";
import { NotFoundError, ConflictError, ValidationError } from "../shared/errors";

export class OrganizationService {
    constructor(private repository: OrganizationRepository) { }

    async getAllOrgs(userId: string) {
        if (!userId) {
            throw new ValidationError("User ID is required");
        }
        const orgs = await this.repository.getUserOrgs(userId);

        if (orgs.length === 0) {
            throw new NotFoundError("No Orgs found");
        }

        return orgs;
    }

    async createOrg(data: { name: string; description: string; userId: string }) {
        const { name, description, userId } = data;

        if (!userId) {
            throw new ValidationError("User ID is required");
        }

        if (!name || !description) {
            throw new ValidationError("Name and description are required");
        }

        const existingOrg = await this.repository.findByName(name);
        if (existingOrg) {
            throw new ConflictError("Organization with this name already exists");
        }

        const newOrg = await this.repository.createOrg({
            name,
            description,
            owner: userId,
        });

        if (!newOrg || !newOrg.id) {
            throw new Error("Organization creation failed");
        }

        const appInstallationUrl = `https://github.com/apps/mini-cms/installations/new?state=${newOrg.id}`;

        return {
            orgId: newOrg.id,
            redirect: appInstallationUrl,
        };
    }

    async updateOrg(orgId: string, updates: { name?: string; description?: string }) {
        if (!orgId) throw new ValidationError("Organization ID is required");
        if (!updates.name && !updates.description) {
            throw new ValidationError("At least one field (name or description) is required to update");
        }

        return await this.repository.updateOrg(orgId, updates);
    }

    async addInstallationId(orgId: string, installationId: string, userId: string) {
        if (!orgId) throw new ValidationError("Organization ID is required");
        if (!installationId) throw new ValidationError("Installation ID is required");

        return await this.repository.addInstallationId(orgId, installationId, userId);
    }

    async getOrgById(orgId: string) {
        if (!orgId) throw new ValidationError("Organization ID is required");
        const org = await this.repository.findById(orgId);
        if (!org) throw new NotFoundError("Organization not found");
        return org;
    }
}
