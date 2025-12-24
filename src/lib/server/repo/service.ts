import { App } from "octokit";
import { RepoRepository } from "./repository";
import { config } from "../shared/config";
import { NotFoundError, ValidationError } from "../shared/errors";
import YAML from "yaml";

export const TARGET_BRANCH = "mini-cms-flow";

export class RepoService {
    private app: App | null = null;

    constructor(private repository: RepoRepository) { }

    private getApp(): App {
        if (!this.app) {
            const appId = config.github.app.id;
            const privateKey = config.github.app.privateKey;

            if (!appId || !privateKey) {
                throw new Error("GitHub App ID or Private Key is missing in configuration");
            }

            this.app = new App({
                appId,
                privateKey,
            });
        }
        return this.app!;
    }

    async addInstallationId(installationId: string, username: string) {
        const user = await this.repository.findUserByGithubName(username);
        if (!user) {
            throw new NotFoundError(`User with GitHub name ${username} not found`);
        }

        await this.repository.updateOrgInstallationId(user.id, installationId);
    }

    async getProjectOctokit(projectId: string) {
        if (!projectId) {
            throw new ValidationError("Project ID is required");
        }

        const project = await this.repository.findProjectById(projectId);
        if (!project) {
            throw new NotFoundError("Project not found");
        }

        const org = await this.repository.findOrgById(project.orgs_id);
        if (!org) {
            throw new NotFoundError("Organization not found for project");
        }

        if (!org.installationId) {
            throw new Error(
                "This organization is not integrated with GitHub. Please install the GitHub app first."
            );
        }

        return await this.getApp().getInstallationOctokit(parseInt(org.installationId));
    }

    async getInstallationOctokit(installationId: string) {
        return await this.getApp().getInstallationOctokit(parseInt(installationId));
    }

    async getAllowedDirectories(
        projectId: string,
        owner: string,
        repo: string
    ): Promise<string[]> {
        try {
            const octokit = await this.getProjectOctokit(projectId);
            const { data: configData } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: ".mini-cms.yml",
                ref: TARGET_BRANCH,
            });

            if (
                !Array.isArray(configData) &&
                configData.type === "file" &&
                configData.content
            ) {
                const configContent = Buffer.from(configData.content, "base64").toString("utf8");
                const parsedConfig = YAML.parse(configContent);
                return parsedConfig.allowed_directories || [];
            }

            return [];
        } catch (e) {
            console.warn("Could not fetch allowed_directories in .mini-cms.yml", e);
            return [];
        }
    }

    async validateAllowedDirectory(
        projectId: string,
        owner: string,
        repo: string,
        path: string
    ): Promise<{ allowed: boolean; allowedDirs?: string[] }> {
        const allowedDirs = await this.getAllowedDirectories(projectId, owner, repo);

        if (allowedDirs.length > 0) {
            const isAllowed = allowedDirs.some(
                (dir: string) => path.startsWith(dir + "/") || path === dir
            );
            return { allowed: isAllowed, allowedDirs };
        }

        return { allowed: false };
    }

    async listRepos(installationId: string) {
        const octokit = await this.getInstallationOctokit(installationId);
        const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
            per_page: 100,
        });

        const sortedRepos = data.repositories.sort((a, b) => {
            const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return bTime - aTime;
        });

        return sortedRepos;
    }

    async getDirectoryContents(projectId: string, owner: string, repo: string, path: string = "") {
        const octokit = await this.getProjectOctokit(projectId);
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref: TARGET_BRANCH,
        });
        return data;
    }

    async getFileContent(projectId: string, owner: string, repo: string, path: string) {
        const octokit = await this.getProjectOctokit(projectId);
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref: TARGET_BRANCH,
        });

        if (Array.isArray(data) || data.type !== "file") {
            throw new Error("Path is a directory, not a file");
        }

        return {
            content: Buffer.from(data.content, "base64").toString("utf-8"),
            sha: data.sha,
        };
    }

    async bulkUpdateFiles(
        projectId: string,
        owner: string,
        repo: string,
        files: { path: string; content: string }[],
        message: string
    ) {
        const octokit = await this.getProjectOctokit(projectId);

        const { data: refData } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${TARGET_BRANCH}`,
        });
        const latestCommitSha = refData.object.sha;

        const blobs = await Promise.all(
            files.map(async (file) => {
                const { data } = await octokit.rest.git.createBlob({
                    owner,
                    repo,
                    content: file.content,
                    encoding: "utf-8",
                });
                return {
                    path: file.path,
                    mode: "100644",
                    type: "blob",
                    sha: data.sha,
                };
            })
        );

        const { data: treeData } = await octokit.rest.git.createTree({
            owner,
            repo,
            base_tree: latestCommitSha,
            tree: blobs as any,
        });

        const { data: commitData } = await octokit.rest.git.createCommit({
            owner,
            repo,
            message,
            tree: treeData.sha,
            parents: [latestCommitSha],
        });

        await octokit.rest.git.updateRef({
            owner,
            repo,
            ref: `heads/${TARGET_BRANCH}`,
            sha: commitData.sha,
        });

        return { success: true, commitSha: commitData.sha };
    }
}
