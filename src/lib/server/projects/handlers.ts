import type { Context } from "hono";
import { ProjectService } from "./service";
import { ProjectRepository } from "./repository";
import { success, error } from "../shared/responses";
import { userProjects } from "@/utils/cachedFn";


const projectRepository = new ProjectRepository();
const projectService = new ProjectService(projectRepository);

export const listProjectsHandler = async (c: Context) => {
    try {
        const user = c.get("user");
        const projects = await projectService.listProjects(user.id);
        return c.json(success(projects));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const createProjectHandler = async (c: Context) => {
    try {
        const user = c.get("user");
        const body = await c.req.json();
        const project = await projectService.createProject({ ...body, userId: user.id });
        return c.json(success({ project }), 201);
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const getProjectSettingsHandler = async (c: Context) => {
    try {
        const projectId = c.req.param("projectId");
        const user = c.get("user");

        const settings = await projectService.getProjectSettings(projectId, user.id);
        return c.json(success(settings));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const updateProjectSettingsHandler = async (c: Context) => {
    try {
        const projectId = c.req.param("projectId");
        const body = await c.req.json();
        const user = c.get("user");

        const settings = await projectService.updateProjectSettings(projectId, body, user.id);
        return c.json(success({ message: "Settings updated successfully", settings }));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const getProjectActivityHandler = async (c: Context) => {
    try {
        const projectId = c.req.param("projectId");
        const { page, limit } = c.req.query();
        const user = c.get("user");

        const activities = await projectService.getProjectActivity(
            projectId,
            parseInt(page || "1"),
            parseInt(limit || "20"),
            user.id
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
        const user = c.get("user");

        const result = await projectService.inviteUser(projectId, email, origin, user.id);
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
        const user = c.get("user");

        const result = await projectService.acceptInvite(token, user.id);

        await userProjects.revalidate(user.id);

        return c.json(success(result));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const getProjectMembersHandler = async (c: Context) => {
    try {
        const projectId = c.req.param("projectId");
        const user = c.get("user");

        const result = await projectService.getProjectMembers(projectId, user.id);
        return c.json(success(result));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};
