import type { Context } from "hono";
import { RepoService } from "./service";
import { RepoRepository } from "./repository";
import { success, error } from "../shared/responses";

// Initialize service
const repoRepository = new RepoRepository();
const repoService = new RepoService(repoRepository);

export const listReposHandler = async (c: Context) => {
    try {
        const { orgInstallationId } = c.req.valid("query" as any);
        const repos = await repoService.listRepos(orgInstallationId);
        return c.json(success(repos));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const getDirectoryContentsHandler = async (c: Context) => {
    try {
        const { owner, repo } = c.req.param();
        const { path } = c.req.valid("query" as any);
        const projectId = c.req.header("x-project-id"); // Assuming passed via header or middleware context?
        // Wait, the original code didn't use projectId for getDirectoryContents?
        // Let's check original implementation.
        // Original used getProjectOctokit which needs projectId.
        // But the route didn't have projectId param.
        // It seems it was mounted under project routes?
        // Ah, projectRepoRoutes is mounted at /:projectId/repo

        // So we can get projectId from param if mounted correctly.
        const mountedProjectId = c.req.param("projectId");

        if (!mountedProjectId) {
            return c.json(error("Project ID is required"), 400);
        }

        const contents = await repoService.getDirectoryContents(mountedProjectId, owner, repo, path);
        return c.json(success(contents));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const getFileContentHandler = async (c: Context) => {
    try {
        const { owner, repo } = c.req.param();
        const { path } = c.req.query();
        const projectId = c.req.param("projectId");

        if (!projectId) {
            return c.json(error("Project ID is required"), 400);
        }

        if (!path) {
            return c.json(error("Path is required"), 400);
        }

        const content = await repoService.getFileContent(projectId, owner, repo, path);
        return c.json(success(content));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const bulkUpdateFilesHandler = async (c: Context) => {
    try {
        const { owner, repo } = c.req.param();
        const projectId = c.req.param("projectId");
        const { files, message } = await c.req.json();

        if (!projectId) {
            return c.json(error("Project ID is required"), 400);
        }

        const result = await repoService.bulkUpdateFiles(projectId, owner, repo, files, message);
        return c.json(success(result));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};
