import type { Context } from "hono";
import { RepoService } from "./service";
import { RepoRepository } from "./repository";
import { success, error } from "../shared/responses";
import { ProjectService } from "../projects/service";
import { ProjectRepository } from "../projects/repository";

const repoRepository = new RepoRepository();
const repoService = new RepoService(repoRepository);
const projectRepository = new ProjectRepository();
const projectService = new ProjectService(projectRepository);

export const listReposHandler = async (c: Context) => {
  try {
    const { orgInstallationId } = c.req.valid("query");
    const repos = await repoService.listRepos(orgInstallationId);
    return c.json(success(repos));
  } catch (err: any) {
    return c.json(error(err.message), err.statusCode || 500);
  }
};

export const getDirectoryContentsHandler = async (c: Context) => {
  try {
    const { owner, repo } = c.req.param();
    const { path } = c.req.valid("query");
    const mountedProjectId = c.req.param("projectId");
    const user = c.get("user");

    if (!path || path === "") {
      return c.json(error("Path is required"), 400);
    }

    if (!mountedProjectId) {
      return c.json(error("Project ID is required"), 400);
    }

    await projectService.checkProjectAccess(mountedProjectId, user.id);

    const { allowed } = await repoService.validateAllowedDirectory(
      mountedProjectId,
      owner,
      repo,
      path,
    );
    if (!allowed) {
      return c.json(error("Access to this directory is not allowed"), 403);
    }

    const contents = await repoService.getDirectoryContents(
      mountedProjectId,
      owner,
      repo,
      path,
    );

    c.header(
      "Cache-Control",
      "private, max-age=60, stale-while-revalidate=300",
    );
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
    const user = c.get("user");

    if (!projectId) {
      return c.json(error("Project ID is required"), 400);
    }

    if (!path) {
      return c.json(error("Path is required"), 400);
    }

    await projectService.checkProjectAccess(projectId, user.id);

    const { allowed } = await repoService.validateAllowedDirectory(
      projectId,
      owner,
      repo,
      path,
    );
    if (!allowed) {
      return c.json(error("Access to this file is not allowed"), 403);
    }

    const content = await repoService.getFileContent(
      projectId,
      owner,
      repo,
      path,
    );

    // Cache file content for 5 minutes with stale-while-revalidate
    // File content changes less frequently than directory listings
    c.header(
      "Cache-Control",
      "private, max-age=300, stale-while-revalidate=600",
    );
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
    const user = c.get("user");

    if (!projectId) {
      return c.json(error("Project ID is required"), 400);
    }

    await projectService.checkProjectAccess(projectId, user.id);

    const allowedDirs = await repoService.getAllowedDirectories(
      projectId,
      owner,
      repo,
    );
    for (const file of files) {
      const isAllowed = allowedDirs.some(
        (dir: string) => file.path.startsWith(dir + "/") || file.path === dir,
      );
      if (!isAllowed) {
        return c.json(error(`Access to ${file.path} is not allowed`), 403);
      }
    }

    const result = await repoService.bulkUpdateFiles(
      projectId,
      owner,
      repo,
      files,
      message,
    );
    return c.json(success(result));
  } catch (err: any) {
    return c.json(error(err.message), err.statusCode || 500);
  }
};

export const getRepoConfigHandler = async (c: Context) => {
  try {
    const { owner, repo } = c.req.param();
    const projectId = c.req.param("projectId");
    const user = c.get("user");

    if (!projectId) {
      return c.json(error("Project ID is required"), 400);
    }

    await projectService.checkProjectAccess(projectId, user.id);

    const config = await repoService.getRepoConfig(projectId, owner, repo);

    c.header(
      "Cache-Control",
      "private, max-age=600, stale-while-revalidate=3600",
    );
    return c.json(success(config));
  } catch (err: any) {
    return c.json(error(err.message), err.statusCode || 500);
  }
};

export const getRecursiveFileTreeHandler = async (c: Context) => {
  try {
    const { owner, repo } = c.req.param();
    const projectId = c.req.param("projectId");
    const user = c.get("user");

    if (!projectId) {
      return c.json(error("Project ID is required"), 400);
    }

    await projectService.checkProjectAccess(projectId, user.id);

    // Get allowed directories from config
    const config = await repoService.getRepoConfig(projectId, owner, repo);
    const allowedDirs = config.map((c: any) => c.path);

    if (allowedDirs.length === 0) {
      return c.json(success({ tree: [], config }));
    }

    // Load all directories recursively in parallel
    const loadDirRecursively = async (dirPath: string): Promise<any[]> => {
      try {
        const contents = await repoService.getDirectoryContents(
          projectId,
          owner,
          repo,
          dirPath,
        );

        const result = await Promise.all(
          contents.map(async (item: any) => {
            // Filter: only keep directories and markdown files (.md, .mdx)
            if (item.type === "file") {
              const isMarkdown =
                item.name.endsWith(".md") || item.name.endsWith(".mdx");
              if (!isMarkdown) return null;
            }

            const node = {
              name: item.name,
              path: item.path,
              type: item.type,
              size: item.size,
              sha: item.sha,
              children: item.type === "dir" ? undefined : undefined,
            };

            // If it's a directory, recursively load its children
            if (item.type === "dir") {
              node.children = await loadDirRecursively(item.path);
            }

            return node;
          }),
        );

        // Filter out null entries (non-markdown files)
        return result.filter((node) => node !== null);
      } catch (err) {
        console.error(`[RecursiveTree] Error loading ${dirPath}:`, err);
        return [];
      }
    };

    // Load all root-level allowed directories in parallel
    const tree = await Promise.all(
      allowedDirs.map(async (dirPath: string) => {
        return {
          name: dirPath,
          path: dirPath,
          type: "dir",
          size: 0,
          sha: "",
          children: await loadDirRecursively(dirPath),
        };
      }),
    );

    c.header(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=300",
    );
    return c.json(success({ tree, config }));
  } catch (err: any) {
    return c.json(error(err.message), err.statusCode || 500);
  }
};

export const createFileHandler = async (c: Context) => {
  try {
    const { owner, repo } = c.req.param();
    const projectId = c.req.param("projectId");
    const { path, content, message } = await c.req.json();
    const user = c.get("user");

    if (!projectId) {
      return c.json(error("Project ID is required"), 400);
    }

    await projectService.checkProjectAccess(projectId, user.id);

    const { allowed, config } = await repoService.validateAllowedDirectory(
      projectId,
      owner,
      repo,
      path,
    );
    if (!allowed) {
      return c.json(error("Access to this directory is not allowed"), 403);
    }

    if (config?.naming_convention) {
      const filename = path.split("/").pop() || "";
      // Remove extension
      const nameWithoutExt = filename.includes(".")
        ? filename.split(".").slice(0, -1).join(".")
        : filename;

      if (
        !repoService.validateFileName(nameWithoutExt, config.naming_convention)
      ) {
        return c.json(
          error(`File name must follow ${config.naming_convention} convention`),
          400,
        );
      }
    }

    const decodedContent = Buffer.from(content, "base64").toString("utf-8");

    const result = await repoService.bulkUpdateFiles(
      projectId,
      owner,
      repo,
      [{ path, content: decodedContent }],
      message,
    );
    return c.json(success(result), 201);
  } catch (err: any) {
    return c.json(error(err.message), err.statusCode || 500);
  }
};

export const uploadMediaHandler = async (c: Context) => {
  try {
    const projectId = c.req.param("projectId");
    const user = c.get("user");

    if (!projectId) {
      return c.json(error("Project ID is required"), 400);
    }

    await projectService.checkProjectAccess(projectId, user.id);

    const body = await c.req.json();
    const { files, mediaPath } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return c.json(error("Files array required"), 400);
    }

    // Get project to find repo details
    const project = await projectService.getProject(projectId);
    if (!project?.github_repo_link) {
      return c.json(error("Project not found"), 404);
    }

    const [owner, repo] = project.github_repo_link
      .replace("https://github.com/", "")
      .split("/");

    // Validate media path is allowed (should be a configured media base path)
    const repoConfig = await repoService.getRepoConfig(projectId, owner, repo);
    const allowedPaths = repoConfig.map((c: any) => c.path);

    const isAllowedPath = allowedPaths.some(
      (allowed: string) =>
        mediaPath.startsWith(allowed) || mediaPath === allowed,
    );

    if (!isAllowedPath) {
      return c.json(
        error("Invalid media path. Must be within allowed directories."),
        403,
      );
    }

    const uploadedFiles = [];
    for (const file of files) {
      const { filename, content } = file;
      const fullPath = `${mediaPath}/${filename}`;

      const result = await repoService.bulkUpdateFiles(
        projectId,
        owner,
        repo,
        [
          {
            path: fullPath,
            content: content,
          },
        ],
        `Upload media: ${filename}`,
      );

      uploadedFiles.push({
        filename,
        path: fullPath,
        url: `https://github.com/${owner}/${repo}/blob/mini-cms-flow/${fullPath}`,
      });
    }

    return c.json(
      success({
        uploaded: uploadedFiles,
        mediaPath,
      }),
      201,
    );
  } catch (err: any) {
    return c.json(error(err.message), err.statusCode || 500);
  }
};

// GET /media - List media files in the media base path
export const listMediaHandler = async (c: Context) => {
  try {
    const projectId = c.req.param("projectId");
    const mediaPath = c.req.query("path");
    const user = c.get("user");

    if (!projectId) {
      return c.json(error("Project ID is required"), 400);
    }

    await projectService.checkProjectAccess(projectId, user.id);

    const project = await projectService.getProject(projectId);
    if (!project?.github_repo_link) {
      return c.json(error("Project not found"), 404);
    }

    const [owner, repo] = project.github_repo_link
      .replace("https://github.com/", "")
      .split("/");

    let targetPath = mediaPath;
    if (!targetPath) {
      const repoConfig = await repoService.getRepoConfig(
        projectId,
        owner,
        repo,
      );
      const firstWithImagePath = repoConfig.find((c: any) => c.base_image_path);
      targetPath = firstWithImagePath?.base_image_path || repoConfig[0]?.path;
    }

    if (!targetPath) {
      return c.json(error("No media path configured"), 400);
    }

    // Get directory contents
    const contents = await repoService.getDirectoryContents(
      projectId,
      owner,
      repo,
      targetPath,
    );

    // Filter for image files only
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    const mediaFiles = contents.filter((item: any) => {
      const ext = item.name.toLowerCase().split(".").pop();
      return item.type === "file" && imageExtensions.includes(`.${ext}`);
    });

    const filesWithUrls = mediaFiles.map((file: any) => ({
      ...file,
      rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/mini-cms-flow/${file.path}`,
      githubUrl: `https://github.com/${owner}/${repo}/blob/mini-cms-flow/${file.path}`,
    }));

    return c.json(
      success({
        path: targetPath,
        files: filesWithUrls,
      }),
    );
  } catch (err: any) {
    return c.json(error(err.message), err.statusCode || 500);
  }
};
