import type { Context } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import { AuthService } from "./service";
import { AuthRepository } from "./repository";
import { success, error } from "../shared/responses";
import { AuthenticationError } from "../shared/errors";
import { config } from "../shared/config";
import { OrganizationRepository } from "../organizations/repository";
import { OrganizationService } from "../organizations/service";


const authRepository = new AuthRepository();
const orgRepository = new OrganizationRepository();
const orgService = new OrganizationService(orgRepository);
const authService = new AuthService(authRepository, orgService);



export const loginHandler = async (c: Context) => {
    const next = c.req.query("next") || "/dashboard";
    const redirect = (next.startsWith('/') && !next.startsWith('//')) ? next : "/dashboard";

    try {
        const authorizeUrl = authService.buildGithubAuthUrl(redirect, `${new URL(c.req.url).origin}`);
        return c.redirect(authorizeUrl);
    } catch (err) {
        console.error('Login handler error:', err);
        return c.json(error('Failed to initiate login'), 500);
    }
};

export const githubCallbackHandler = async (c: Context) => {
    const { code, state } = c.req.valid("query");

    try {
        const result = await authService.handleGithubCallback(code, state);

        setCookie(c, config.auth.cookies.accessToken.name, result.tokens.accessToken, config.auth.cookies.accessToken);
        setCookie(c, config.auth.cookies.refreshToken.name, result.tokens.refreshToken, config.auth.cookies.refreshToken);

        // if (result.githubToken) {
        //     setCookie(c, 'gh_access_token', result.githubToken, {
        //         httpOnly: true,
        //         secure: config.auth.cookies.accessToken.secure,
        //         maxAge: config.auth.cookies.accessToken.maxAge,
        //         path: "/",
        //     });
        // }

        return c.redirect(result.redirectUrl);
    } catch (err) {
        console.error('GitHub callback error:', err);
        return c.redirect('/auth/login?error=callback_failed');
    }
};

export const googleCallbackHandler = async (c: Context) => {
    const { code, state } = c.req.valid("query");

    try {
        const result = await authService.handleGoogleCallback(code, state, `${new URL(c.req.url).origin}`);


        setCookie(c, config.auth.cookies.accessToken.name, result.tokens.accessToken, config.auth.cookies.accessToken);
        setCookie(c, config.auth.cookies.refreshToken.name, result.tokens.refreshToken, config.auth.cookies.refreshToken);

        return c.redirect(result.redirectUrl);
    } catch (err) {
        console.error('Google callback error:', err);
        return c.redirect('/auth/login?error=callback_failed');
    }
};

export const refreshTokenHandler = async (c: Context) => {
    const refreshToken = getCookie(c, config.auth.cookies.refreshToken.name);

    if (!refreshToken) {
        throw new AuthenticationError('No refresh token provided');
    }

    try {
        const newTokens = await authService.refreshTokens(refreshToken);

        setCookie(c, config.auth.cookies.accessToken.name, newTokens.accessToken, config.auth.cookies.accessToken);
        setCookie(c, config.auth.cookies.refreshToken.name, newTokens.refreshToken, config.auth.cookies.refreshToken);

        return c.json(success({ message: 'Token refreshed successfully' }));
    } catch (err) {
        setCookie(c, config.auth.cookies.accessToken.name, '', { maxAge: 0, path: '/' });
        setCookie(c, config.auth.cookies.refreshToken.name, '', { maxAge: 0, path: '/' });

        throw new AuthenticationError('Invalid or expired refresh token');
    }
};

export const googleLoginHandler = async (c: Context) => {
    const redirect = c.req.query("next") || "/dashboard";

    try {
        const authorizeUrl = authService.buildGoogleAuthUrl(redirect, `${new URL(c.req.url).origin}`);
        return c.redirect(authorizeUrl);
    } catch (err) {
        console.error('Google login handler error:', err);
        return c.json(error('Failed to initiate Google login'), 500);
    }
};

/**
 * Logout handler - blacklists both access and refresh tokens
 */
export const logoutHandler = async (c: Context) => {
    const accessToken = getCookie(c, config.auth.cookies.accessToken.name);
    const refreshToken = getCookie(c, config.auth.cookies.refreshToken.name);

    // Even if tokens are missing, we still clear the cookies
    if (accessToken && refreshToken) {
        try {
            await authService.logoutUser(accessToken, refreshToken);
        } catch (err) {
            // console.error('Logout error (blacklist):', err);
            // Continue with cookie clearing even if blacklist fails
        }
    }

    // Clear authentication cookies
    setCookie(c, config.auth.cookies.accessToken.name, '', { maxAge: 0, path: '/' });
    setCookie(c, config.auth.cookies.refreshToken.name, '', { maxAge: 0, path: '/' });
    setCookie(c, 'gh_access_token', '', { maxAge: 0, path: '/' });

    return c.json(success({ message: 'Logged out successfully' }));
};

export const getUser = async (token: string) => {
    return await authService.getCurrentUser(token);
};
