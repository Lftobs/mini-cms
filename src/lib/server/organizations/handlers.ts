import type { Context } from "hono";
import { OrganizationService } from "./service";
import { OrganizationRepository } from "./repository";
import { success, error } from "../shared/responses";


export const getAllOrgsHandler = async (c: Context) => {
    const orgRepository = new OrganizationRepository();
    const orgService = new OrganizationService(orgRepository);
    try {
        const user = c.get("user");
        const orgs = await orgService.getAllOrgs(user.id);
        return c.json(success(orgs));
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};

export const createOrgHandler = async (c: Context) => {
    const orgRepository = new OrganizationRepository();
    const orgService = new OrganizationService(orgRepository);
    try {
        const user = c.get("user");
        const body = await c.req.json();
        const result = await orgService.createOrg({ ...body, userId: user.id });
        return c.json(success(result), 201);
    } catch (err: any) {
        return c.json(error(err.message), err.statusCode || 500);
    }
};
