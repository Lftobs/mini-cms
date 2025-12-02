import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { ProjectService } from "./service";
import { ProjectRepository } from "./repository";
import { success, error } from "../shared/responses";
import { getUser } from "../auth/handlers";
import { userProjects } from "@/utils/cachedFn";

// Initialize service
const projectRepository = new ProjectRepository();
const projectService = new ProjectService(projectRepository);

export const listProjectsHandler = async (c: Context) => {
    try {
        const userId = c.req.query("userId");
        if (!userId) throw new Error("User ID is required");
        const projects = await projectService.listProjects(userId);
        return c.json(success(projects));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const createProjectHandler = async (c: Context) => {
    try {
        const body = await c.req.json();
        const project = await projectService.createProject(body);
        return c.json(success({ project }), 201);
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const getProjectSettingsHandler = async (c: Context) => {
    try {
        const projectId = c.req.param("projectId");

        const accessToken = getCookie(c, "access_token");
        if (!accessToken) return c.json(error("Authentication required"), 401);
        const currentUser = await getUser(accessToken);
        if (!currentUser) return c.json(error("Invalid session"), 401);

        const settings = await projectService.getProjectSettings(projectId, currentUser.id);
        return c.json(success(settings));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const updateProjectSettingsHandler = async (c: Context) => {
    try {
        const projectId = c.req.param("projectId");
        const body = await c.req.json();

        const accessToken = getCookie(c, "access_token");
        if (!accessToken) return c.json(error("Authentication required"), 401);
        const currentUser = await getUser(accessToken);
        if (!currentUser) return c.json(error("Invalid session"), 401);

        const settings = await projectService.updateProjectSettings(projectId, body, currentUser.id);
        return c.json(success({ message: "Settings updated successfully", settings }));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const getProjectActivityHandler = async (c: Context) => {
    try {
        const projectId = c.req.param("projectId");
        const { page, limit } = c.req.query();

        const accessToken = getCookie(c, "access_token");
        if (!accessToken) return c.json(error("Authentication required"), 401);
        const currentUser = await getUser(accessToken);
        if (!currentUser) return c.json(error("Invalid session"), 401);

        const activities = await projectService.getProjectActivity(
            projectId,
            parseInt(page || "1"),
            parseInt(limit || "20"),
            currentUser.id
        );
        return c.json(success(activities));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const inviteUserHandler = async (c: Context) => {
    try {
        const projectId = c.req.param("projectId");
        const { email } = await c.req.json();
        const origin = new URL(c.req.url).origin;

        const accessToken = getCookie(c, "access_token");
        if (!accessToken) return c.json(error("Authentication required"), 401);
        const currentUser = await getUser(accessToken);
        if (!currentUser) return c.json(error("Invalid session"), 401);

        const result = await projectService.inviteUser(projectId, email, origin, currentUser.id);
        return c.json(success({
            message: "Invitation sent successfully",
            ...result,
            emailSent: true
        }));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const acceptInviteHandler = async (c: Context) => {
    try {
        const { token } = await c.req.json();

        // Get user from cookie
        const accessToken = getCookie(c, "access_token");
        if (!accessToken) {
            return c.json(error("Authentication required"), 401);
        }

        const currentUser = await getUser(accessToken);
        if (!currentUser) {
            return c.json(error("Invalid session"), 401);
        }

        const result = await projectService.acceptInvite(token, currentUser.id);

        // Revalidate user projects cache so the new project appears in their list
        await userProjects.revalidate(currentUser.id);

        return c.json(success(result));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const getProjectMembersHandler = async (c: Context) => {
    try {
        const projectId = c.req.param("projectId");

        const accessToken = getCookie(c, "access_token");
        if (!accessToken) return c.json(error("Authentication required"), 401);
        const currentUser = await getUser(accessToken);
        if (!currentUser) return c.json(error("Invalid session"), 401);

        const result = await projectService.getProjectMembers(projectId, currentUser.id);
        return c.json(success(result));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};
