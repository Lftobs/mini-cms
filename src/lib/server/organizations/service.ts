import { OrganizationRepository } from "./repository";
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from "../shared/errors";

export class OrganizationService {
    constructor(private repository: OrganizationRepository) { }

    async getAllOrgs(userId: string) {
        if (!userId) {
            throw new ValidationError("User ID is required");
        }
        const orgs = await this.repository.getUserOrgs(userId);

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

        const result = await this.repository.addInstallationId(orgId, installationId, userId);

        if (installationId) {
            try {
                const { RepoService } = await import("../repo/service");
                const { RepoRepository } = await import("../repo/repository");
                const repoService = new RepoService(new RepoRepository());
                const octokit = await repoService.getInstallationOctokit(installationId);
                const { data: installation } = await octokit.rest.apps.getInstallation({
                    installation_id: parseInt(installationId),
                });

                if (installation.account && 'login' in installation.account) {
                    await this.repository.updateUserGithubStatus(userId, installation.account.login);
                }
            } catch (error) {
                console.error('Failed to update user GitHub status after installation:', error);
            }
        }

        return result;
    }

    async getOrgById(orgId: string) {
        if (!orgId) throw new ValidationError("Organization ID is required");
        const org = await this.repository.findById(orgId);
        if (!org) throw new NotFoundError("Organization not found");
        return org;
    }

    async checkOrgAccess(orgId: string, userId: string) {
        const org = await this.getOrgById(orgId);
        if (org.owner === userId) {
            return { isOwner: true, isMember: true };
        }

        const member = await this.repository.findOrgMember(orgId, userId);
        if (member) {
            return { isOwner: false, isMember: true };
        }

        throw new ForbiddenError("You do not have access to this organization");
    }
}
