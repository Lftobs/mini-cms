import { ProjectRepository } from "./repository";
import { OrganizationRepository } from "../organizations/repository";
import { OrganizationService } from "../organizations/service";
import { RepoService } from "../repo/service";
import { RepoRepository } from "../repo/repository";
import { sendInviteEmail } from "../email";
import YAML from "yaml";
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from "../shared/errors";
import { config } from "../shared/config";
import { AuthService } from "../auth/service";
import { AuthRepository } from "../auth/repository";

const CONFIG_BRANCH = "mini-cms-flow";
const CONFIG_FILE = ".mini-cms.yml";

export class ProjectService {
    private repoService: RepoService;
    private authRepo: AuthRepository;

    constructor(private repository: ProjectRepository) {
        this.repoService = new RepoService(new RepoRepository());
        this.authRepo = new AuthRepository();
    }

    async listProjects(userId: string) {
        if (!userId) {
            throw new ValidationError("User ID is required");
        }
        return await this.repository.getUserProjects(userId);
    }

    async createProject(data: {
        name: string;
        repo_name: string;
        github_repo_url: string;
        orgs_id: string;
        userId: string;
    }) {
        const { name, repo_name, github_repo_url, orgs_id, userId } = data;

        if (!name || !repo_name || !github_repo_url || !orgs_id || !userId) {
            throw new ValidationError("Name, repo_name, github_repo_url, orgs_id and userId are required");
        }

        const orgRepository = new OrganizationRepository();
        const orgService = new OrganizationService(orgRepository);
        await orgService.checkOrgAccess(orgs_id, userId);

        const existingProject = await this.repository.findByName(name);
        if (existingProject) {
            throw new ConflictError("Project with this name already exists");
        }

        const project = await this.repository.createProject({
            name,
            linked_repo_name: repo_name,
            github_repo_link: github_repo_url,
            orgs_id,
        });

        if (!project) {
            throw new Error("Project not created successfully");
        }

        return project;
    }

    async checkProjectAccess(
        projectId: string,
        userId: string,
        accessType: "owner" | "member" | "both" = "both"
    ) {
        const project = await this.repository.getProjectWithOrg(projectId);
        if (!project) {
            throw new NotFoundError("Project not found");
        }

        if ((accessType === "owner" || accessType === "both") && project.owner === userId) {
            return true;
        }

        if (accessType === "member" || accessType === "both") {
            const member = await this.repository.findMember(projectId, userId);
            if (member) {
                return true;
            }
        }

        throw new ForbiddenError("You do not have access to this project");
    }

    async getProjectSettings(projectId: string, userId: string) {
        if (!projectId) {
            throw new ValidationError("Project ID is required");
        }

        await this.checkProjectAccess(projectId, userId);

        let githubConfig;
        try {
            githubConfig = await this.ensureProjectConfig(projectId);
        } catch (e) {
            console.error("Error ensuring project config:", e);
            throw new Error("Failed to ensure project configuration on GitHub");
        }

        if (!githubConfig || typeof githubConfig !== 'object') {
            githubConfig = { allowed_directories: [] };
        }

        let settings = await this.repository.getSettings(projectId);

        const dbValues = {
            project_id: projectId,
            public_directories: JSON.stringify(githubConfig.allowed_directories ?? []),
            allow_file_creation: settings?.allow_file_creation ?? false,
            allow_file_editing: settings?.allow_file_editing ?? true,
            allow_file_deletion: settings?.allow_file_deletion ?? false,
            max_file_size: settings?.max_file_size ?? 1048576,
            allowed_extensions: settings?.allowed_extensions ?? JSON.stringify([".md", ".mdx", ".txt"]),
            require_approval: settings?.require_approval ?? true,
            auto_merge: settings?.auto_merge ?? false,
            collaborator_message: settings?.collaborator_message ?? "Welcome! You can edit files in the allowed directories.",
        };

        return await this.repository.upsertSettings(projectId, dbValues);
    }

    async updateProjectSettings(projectId: string, settings: any, userId: string) {
        if (!projectId) {
            throw new ValidationError("Project ID is required");
        }

        await this.checkProjectAccess(projectId, userId, "owner");

        const project = await this.repository.findById(projectId);
        if (!project || !project.linked_repo_name || !project.github_repo_link) {
            throw new NotFoundError("Project or linked repository not found");
        }

        const octokit = await this.repoService.getProjectOctokit(projectId);
        const [owner, repo] = project.github_repo_link
            .replace(/^https?:\/\/github\.com\//, "")
            .replace(/\.git$/, "")
            .replace(/\/$/, "")
            .split("/");

        let sha: string | undefined;
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: CONFIG_FILE,
                ref: CONFIG_BRANCH,
            });
            if (!Array.isArray(data) && data.type === "file") {
                sha = data.sha;
            }
        } catch (e) {
            // should exist if we called getProjectSettings first...TODO: log err
        }

        const newConfig = {
            allowed_directories: settings.public_directories ? JSON.parse(settings.public_directories) : [],
        };

        const configContent = YAML.stringify(newConfig);

        await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: CONFIG_FILE,
            message: "Update mini-cms configuration",
            content: Buffer.from(configContent).toString("base64"),
            branch: CONFIG_BRANCH,
            sha,
        });

        return await this.repository.upsertSettings(projectId, settings);
    }

    async getProjectActivity(projectId: string, page: number = 1, limit: number = 20, userId: string) {
        if (!projectId) {
            throw new ValidationError("Project ID is required");
        }

        await this.checkProjectAccess(projectId, userId);

        const offset = (page - 1) * limit;
        return await this.repository.getActivity(projectId, limit, offset);
    }

    async logActivity(
        projectId: string,
        actionType: string,
        filePath: string,
        fileName: string,
        contributorData?: { name?: string; email?: string; ip?: string },
        additionalData?: {
            changesSummary?: string;
            contentPreview?: string;
            prNumber?: number;
            prStatus?: string;
            fileSize?: number;
        }
    ) {
        await this.repository.logActivity({
            project_id: projectId,
            action_type: actionType,
            file_path: filePath,
            file_name: fileName,
            contributor_name: contributorData?.name,
            contributor_email: contributorData?.email,
            contributor_ip: contributorData?.ip,
            changes_summary: additionalData?.changesSummary,
            content_preview: additionalData?.contentPreview,
            pr_number: additionalData?.prNumber,
            pr_status: additionalData?.prStatus,
            file_size: additionalData?.fileSize,
        });
    }

    async inviteUser(projectId: string, email: string, origin: string, userId: string) {
        if (!projectId || !email) {
            throw new ValidationError("Project ID and email are required");
        }

        await this.checkProjectAccess(projectId, userId);

        const existingMember = await this.repository.findMemberByEmail(projectId, email);
        if (existingMember) {
            throw new ConflictError("User is already a member of this project");
        }

        const existingInvite = await this.repository.findPendingInvite(projectId, email);
        if (existingInvite) {
            throw new ConflictError("Invitation already sent");
        }

        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.repository.createInvite({
            projectId,
            email,
            role: "editor",
            token,
            expiresAt,
        });

        const projectInfo = await this.repository.getProjectWithOrg(projectId);
        if (!projectInfo) {
            throw new NotFoundError("Project not found");
        }

        const inviteLink = `${origin}/invite/${token}`;

        //TODO: implement rollback if email fails
        sendInviteEmail({
            to: email,
            projectName: `${projectInfo.name} (${projectInfo.orgName})`,
            inviteLink,
            expiresInDays: 7,
        }).catch((err) => {
            console.error(`[Invite] Email sending error:`, err);
        });

        return { inviteLink };
    }

    async acceptInvite(token: string, userId: string) {
        if (!token) throw new ValidationError("Token is required");
        if (!userId) throw new ValidationError("User ID is required");

        const user = await this.authRepo.findById(userId);
        const invite = await this.repository.findInviteByToken(token);

        if (!invite) throw new NotFoundError("Invalid invitation");

        if (!user || !user.email) {
            throw new ValidationError("User email not found");
        }

        if (user.email.toLowerCase() !== invite?.email.toLowerCase()) {
            throw new ForbiddenError("This invitation was sent to a different email address");
        }

        if (invite.status !== "pending") {
            throw new ValidationError("Invitation is no longer valid");
        }

        if (new Date() > invite.expiresAt) {
            await this.repository.updateInviteStatus(invite.id, "expired");
            throw new ValidationError("Invitation expired");
        }

        const project = await this.repository.getProjectWithOrg(invite.projectId);
        if (!project) throw new NotFoundError("Project not found");

        const existingOrgMember = await this.repository.findOrgMember(project.orgId, userId);
        if (!existingOrgMember) {
            await this.repository.addOrgMember(project.orgId, userId, "member");
        }

        const existingProjectMember = await this.repository.findMember(invite.projectId, userId);
        if (!existingProjectMember) {
            await this.repository.updateInviteStatus(invite.id, "accepted");
            await this.repository.addProjectMember(invite.projectId, userId, invite.role);

            return { projectId: invite.projectId };
        }

        return { projectId: invite.projectId };
    }

    async getProjectMembers(projectId: string, userId: string) {
        if (!projectId) throw new ValidationError("Project ID is required");

        await this.checkProjectAccess(projectId, userId);

        const members = await this.repository.getProjectMembers(projectId);
        const pendingInvites = await this.repository.getPendingInvites(projectId);

        return { members, pendingInvites };
    }

    // helper: ensure project config
    private async ensureProjectConfig(projectId: string) {
        const project = await this.repository.findById(projectId);
        if (!project || !project.linked_repo_name || !project.github_repo_link) {
            throw new Error("Project or linked repository not found");
        }

        const octokit = await this.repoService.getProjectOctokit(projectId);
        const [owner, repo] = project.github_repo_link
            .replace("https://github.com/", "")
            .split("/");

        // check if branch exists
        let branchExists = false;
        try {
            await octokit.rest.repos.getBranch({
                owner,
                repo,
                branch: CONFIG_BRANCH,
            });
            branchExists = true;
        } catch (e) {
            // branch doesn't exist
        }

        if (!branchExists) {
            const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
            const defaultBranch = repoData.default_branch;
            const { data: refData } = await octokit.rest.git.getRef({
                owner,
                repo,
                ref: `heads/${defaultBranch}`,
            });

            await octokit.rest.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${CONFIG_BRANCH}`,
                sha: refData.object.sha,
            });
        }

        // check if config file exists
        let configContent = "";
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: CONFIG_FILE,
                ref: CONFIG_BRANCH,
            });

            if (!Array.isArray(data) && data.type === "file") {
                configContent = Buffer.from(data.content, "base64").toString("utf-8");
            }
        } catch (e) {
            // create default config
            const defaultConfig = { allowed_directories: [] };
            configContent = YAML.stringify(defaultConfig);

            await octokit.rest.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: CONFIG_FILE,
                message: "Initialize mini-cms configuration",
                content: Buffer.from(configContent).toString("base64"),
                branch: CONFIG_BRANCH,
            });
        }

        return YAML.parse(configContent);
    }
}
