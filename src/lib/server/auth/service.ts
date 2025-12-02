import jwt from "jsonwebtoken";
import axios from "axios";
import { Octokit } from "@octokit/rest";
import { AuthRepository } from "./repository";
import { config } from "../shared/config";
import { AuthenticationError } from "../shared/errors";
import type { User, CreateUserData } from "../shared/types";
import type { OrganizationService } from "../organizations/service";
import { isBlacklisted, addToBlacklist, blacklistTokenPair } from "./blacklist";

export interface TokenPayload {
    id: string;
    githubName: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResult {
    user: User;
    tokens: AuthTokens;
    redirectUrl: string;
    githubToken?: string;
}

export interface GitHubUser {
    id: number;
    login: string;
    email: string;
    name: string;
    avatar_url: string;
}

export interface GoogleUser {
    id: string;
    email: string;
    name: string;
    picture: string;
}

export class AuthService {
    constructor(private repository: AuthRepository, private orgService: OrganizationService) { }

    buildGithubAuthUrl(redirect: string, baseUrl: string = config.app.baseUrl): string {
        const state = Buffer.from(JSON.stringify({ redirect })).toString('base64');
        const redirectUri = `${baseUrl}/api/auth/github/callback`;
        const scope = "repo orgs";

        return `https://github.com/login/oauth/authorize?client_id=${config.auth.github.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
    }

    async handleGithubCallback(code: string, state?: string): Promise<AuthResult> {
        const githubToken = await this.exchangeGithubCode(code);

        const githubUser = await this.getGithubUser(githubToken);

        const [user, existing] = await this.repository.findOrCreateUser({
            email: githubUser.email,
            username: githubUser.name || githubUser.login,
            githubName: githubUser.login,
            provider: 'github',
            isGithubEnabled: true,
            pfp: githubUser.avatar_url,
        });


        const tokens = this.generateTokens({
            id: user.id,
            githubName: user.githubName || '',
        });

        let appInstallationUrl: string | undefined;

        if (!existing) {
            const createDefaultOrg = await this.orgService.createOrg({
                name: `${user.githubName}-org`,
                description: "Default organization",
                userId: user.id,
            });
            appInstallationUrl = createDefaultOrg.redirect;

        }

        return {
            user,
            tokens,
            githubToken,
            redirectUrl: appInstallationUrl ? appInstallationUrl : this.extractRedirectUrl(state),
        };
    }

    buildGoogleAuthUrl(redirect: string, baseUrl: string = config.app.baseUrl): string {
        const state = Buffer.from(JSON.stringify({ redirect: decodeURIComponent(redirect) })).toString('base64');

        const redirectUri = `${baseUrl}/api/auth/google/callback`;
        const scope = "openid email profile";

        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.auth.google.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&state=${encodeURIComponent(state)}`;
    }

    async handleGoogleCallback(code: string, state?: string, baseUrl: string = config.app.baseUrl): Promise<AuthResult> {
        const googleTokens = await this.exchangeGoogleCode(code, baseUrl);

        const googleUser = await this.getGoogleUser(googleTokens.access_token);

        const [user, existing] = await this.repository.findOrCreateUser({
            email: googleUser.email,
            username: googleUser.name || googleUser.email.split('@')[0],
            googleId: googleUser.id,
            provider: 'google',
            isGithubEnabled: false,
            pfp: googleUser.picture,
        });

        const tokens = this.generateTokens({
            id: user.id,
            githubName: user.githubName || '',
        });

        return {
            user,
            tokens,
            redirectUrl: this.extractRedirectUrl(state)
        };
    }

    // Token Management
    generateTokens(payload: TokenPayload): AuthTokens {
        const accessToken = jwt.sign({ data: payload }, config.auth.jwt.secret, {
            expiresIn: config.auth.jwt.accessTokenExpiry,
        });

        const refreshToken = jwt.sign({ data: payload }, config.auth.jwt.refreshSecret, {
            expiresIn: config.auth.jwt.refreshTokenExpiry,
        });

        return { accessToken, refreshToken };
    }

    async verifyAccessToken(token: string): Promise<TokenPayload> {
        try {
            // Check if token is blacklisted first
            if (await isBlacklisted(token)) {
                throw new AuthenticationError('Token has been revoked');
            }

            const decoded = jwt.verify(token, config.auth.jwt.secret) as { data: TokenPayload };
            return decoded.data;
        } catch (error) {
            if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError('Invalid or expired access token');
        }
    }

    async verifyRefreshToken(token: string): Promise<TokenPayload> {
        try {
            if (await isBlacklisted(token)) {
                throw new AuthenticationError('Refresh token has been revoked');
            }

            const decoded = jwt.verify(token, config.auth.jwt.refreshSecret) as { data: TokenPayload };
            return decoded.data;
        } catch (error) {
            if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError('Invalid or expired refresh token');
        }
    }

    async refreshTokens(refreshToken: string): Promise<AuthTokens> {
        const payload = await this.verifyRefreshToken(refreshToken);

        const user = await this.repository.findById(payload.id);
        if (!user) {
            throw new AuthenticationError('User not found');
        }

        // blacklist the old refresh token to prevent reuse (token rotation)
        // refresh tokens expire in 7 days (604800 seconds)
        await addToBlacklist(refreshToken, config.auth.cookies.refreshToken.maxAge);

        return this.generateTokens({
            id: user.id,
            githubName: user.githubName || '',
        });
    }

    // helper method for middleware
    async getCurrentUser(accessToken: string): Promise<User | null> {
        try {
            const payload = await this.verifyAccessToken(accessToken);
            return await this.repository.findById(payload.id);
        } catch (error) {
            return null;
        }
    }

    /**
     * Logout user by blacklisting their tokens
     * 
     * @param accessToken - User's access token
     * @param refreshToken - User's refresh token
     */
    async logoutUser(accessToken: string, refreshToken: string): Promise<void> {
        // Blacklist both tokens with their respective TTLs
        await blacklistTokenPair(
            accessToken,
            refreshToken,
            config.auth.cookies.accessToken.maxAge,
            config.auth.cookies.refreshToken.maxAge,
        );
    }

    /** private helper methods **/
    private async exchangeGithubCode(code: string): Promise<string> {
        try {
            const response = await axios.post("https://github.com/login/oauth/access_token", {
                client_id: config.auth.github.clientId,
                client_secret: config.auth.github.clientSecret,
                code,
            }, {
                headers: { Accept: "application/json", timeout: 30000 }
            });

            const accessToken = response.data.access_token;
            if (!accessToken) {
                throw new Error('No access token received from GitHub');
            }

            return accessToken;
        } catch (error) {
            console.error('GitHub code exchange error:', error);
            throw new AuthenticationError('Failed to authenticate with GitHub');
        }
    }

    private async getGithubUser(accessToken: string): Promise<GitHubUser> {
        try {
            const octokit = new Octokit({ auth: accessToken });
            const { data: user } = await octokit.users.getAuthenticated();
            return user as GitHubUser;
        } catch (error) {
            console.error('GitHub user fetch error:', error);
            throw new AuthenticationError('Failed to fetch user information from GitHub');
        }
    }

    private async exchangeGoogleCode(code: string, baseUrl: string = config.app.baseUrl): Promise<{ access_token: string; id_token: string }> {
        try {
            const response = await axios.post("https://oauth2.googleapis.com/token", {
                client_id: config.auth.google.clientId,
                client_secret: config.auth.google.clientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: `${baseUrl}/api/auth/google/callback`,
            });

            return response.data;
        } catch (error) {
            console.error('Google code exchange error:', error);
            throw new AuthenticationError('Failed to authenticate with Google');
        }
    }

    private async getGoogleUser(accessToken: string): Promise<GoogleUser> {
        try {
            const response = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            return response.data;
        } catch (error) {
            console.error('Google user fetch error:', error);
            throw new AuthenticationError('Failed to fetch user information from Google');
        }
    }

    private extractRedirectUrl(state?: string): string {
        if (!state) return '/dashboard';

        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
            return decoded.redirect || '/dashboard';
        } catch {
            return '/dashboard';
        }
    }
}
