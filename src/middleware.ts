import { defineMiddleware } from "astro:middleware";
import { runWithContext } from "./utils/requestContext";

import { getUser } from "./lib/server/auth/handlers";
import { AuthService } from "./lib/server/auth/service";
import { AuthRepository } from "./lib/server/auth/repository";
import { OrganizationService } from "./lib/server/organizations/service";
import { OrganizationRepository } from "./lib/server/organizations/repository";
import { config } from "./lib/server/shared/config";



const authRepository = new AuthRepository();
const orgRepository = new OrganizationRepository();
const orgService = new OrganizationService(orgRepository);
const authService = new AuthService(authRepository, orgService);



export const onRequest = defineMiddleware(async (context, next) => {
	const cookie = context.request.headers.get("cookie") || "";

	return runWithContext({ headers: { cookie } }, async () => {
		const pathname = context.url.pathname;


		if (isPublicRoute(pathname)) {
			return next();
		}

		const accessToken = context.cookies.get("access_token")?.value;
		const refreshToken = context.cookies.get("refresh_token")?.value;

		const nextParam = encodeURIComponent(pathname + context.url.search);
		const loginUrl = `/auth/login?next=${nextParam}`;

		if (!accessToken && refreshToken) {
			try {
				const newTokens = await authService.refreshTokens(refreshToken);

				context.cookies.set(config.auth.cookies.accessToken.name, newTokens.accessToken, config.auth.cookies.accessToken);
				context.cookies.set(config.auth.cookies.refreshToken.name, newTokens.refreshToken, config.auth.cookies.refreshToken);

				const currentUser = await getUser(newTokens.accessToken);
				if (currentUser) {
					context.locals.currentUser = currentUser;
					return next();
				}
			} catch (error) {
				console.error("Token refresh error:", error);
				context.cookies.delete("access_token", { path: "/" });
				context.cookies.delete("refresh_token", { path: "/" });
				return context.redirect(loginUrl);
			}
		}

		if (!accessToken && !refreshToken) {
			return context.redirect(loginUrl);
		}
		if (accessToken) {
			try {
				const currentUser = await getUser(accessToken);

				if (currentUser) {
					context.locals.currentUser = currentUser;
					return next();
				}

				if (refreshToken) {
					try {
						const newTokens = await authService.refreshTokens(refreshToken);
						context.cookies.set(config.auth.cookies.accessToken.name, newTokens.accessToken, config.auth.cookies.accessToken);
						context.cookies.set(config.auth.cookies.refreshToken.name, newTokens.refreshToken, config.auth.cookies.refreshToken);

						const refreshedUser = await getUser(newTokens.accessToken);
						if (refreshedUser) {
							context.locals.currentUser = refreshedUser;
							return next();
						}
					} catch (refreshError) {
						console.error("Token refresh error:", refreshError);
						context.cookies.delete("access_token", { path: "/" });
						context.cookies.delete("refresh_token", { path: "/" });
					}
				}
				return context.redirect(loginUrl);
			} catch (error) {
				console.error("Auth middleware error:", error);
				return context.redirect(loginUrl);
			}
		}
		return context.redirect(loginUrl);
	});
});


const publicRoutes = ["/auth/login", "/api/auth", "/_astro", "/favicon.ico", "/sitemap-index.xml", "/sitemap-0.xml", "/docs"];

const isPublicRoute = (pathname: string) => {
	return publicRoutes.some((route) => {
		if (route === "/" && pathname === "/") return true;
		if (route !== "/" && pathname === route) return true;
		if (route !== "/" && pathname.startsWith(route + "/")) return true;
		return false;
	});
};
