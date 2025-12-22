import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { config } from "./config";
import { error } from "./responses";
import { AuthRepository } from "../auth/repository";
import { AuthService } from "../auth/service";
import { OrganizationRepository } from "../organizations/repository";
import { OrganizationService } from "../organizations/service";
import type { User } from "./types";


const authRepository = new AuthRepository();
const orgRepository = new OrganizationRepository();
const orgService = new OrganizationService(orgRepository);
const authService = new AuthService(authRepository, orgService);

export type AuthVariables = {
    user: User;
};

/**
 * Middleware to authenticate user via JWT token in cookies
 */
export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const accessToken = getCookie(c, config.auth.cookies.accessToken.name);

    if (!accessToken) {
        return await next();
    }

    try {
        const user = await authService.getCurrentUser(accessToken);
        if (user) {
            c.set("user", user);
        }
    } catch (err) {
        console.error('[Auth] Failed to authenticate user from token:', err);
    }

    await next();
});

/**
 * Middleware to require authentication
 */
export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
        return c.json(error("Authentication required"), 401);
    }

    await next();
});
