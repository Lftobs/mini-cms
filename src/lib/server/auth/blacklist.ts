import { createHash } from "crypto";
import { db, Blacklist, eq, lt } from "astro:db";

/**
 * Token Blacklist Service using Astro DB (Turso)
 * 
 * This service manages the blacklisting of JWT tokens (both access and refresh tokens).
 * When tokens are invalidated (e.g., on logout or refresh), they are added to the DB.
 */

/**
 * Hash a token using SHA-256 for storage
 * We hash tokens before storing to avoid storing raw JWTs
 * 
 * @param token - The JWT token to hash
 * @returns Hex-encoded SHA-256 hash of the token
 */
function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

/**
 * Helper to occasionally clean up expired tokens from the DB
 */
async function cleanupExpiredTokens() {
    try {
        // Only run 10% of the time to avoid DB overhead on every write
        if (Math.random() < 0.1) {
            await db.delete(Blacklist).where(lt(Blacklist.expiresAt, Date.now()));
        }
    } catch (e) {
        console.warn("Failed to clean up expired tokens", e);
    }
}

/**
 * Add a token to the blacklist
 * 
 * @param token - The JWT token to blacklist
 * @param expiresInSeconds - Time in seconds until the token naturally expires
 * @returns Promise that resolves when token is blacklisted
 */
export async function addToBlacklist(
    token: string,
    expiresInSeconds: number,
): Promise<void> {
    try {
        const tokenHash = hashToken(token);
        const expiresAt = Date.now() + (expiresInSeconds * 1000);

        await db.insert(Blacklist).values({
            id: tokenHash,
            expiresAt: expiresAt
        }).onConflictDoNothing();

        // Fire and forget cleanup
        cleanupExpiredTokens().catch(() => {});
    } catch (error) {
        throw new Error("Failed to blacklist token");
    }
}

/**
 * Check if a token is blacklisted
 * 
 * @param token - The JWT token to check
 * @returns Promise that resolves to true if token is blacklisted, false otherwise
 */
export async function isBlacklisted(token: string): Promise<boolean> {
    try {
        const tokenHash = hashToken(token);

        const result = await db.select()
            .from(Blacklist)
            .where(eq(Blacklist.id, tokenHash))
            .get();

        if (result && result.expiresAt < Date.now()) {
            // Already expired, no longer matters
            return false;
        }

        return result !== undefined;
    } catch (error) {
        console.error("[Blacklist] Error checking token blacklist:", error);
        // Fail closed for security (treat as blacklisted if we can't verify)
        return true;
    }
}

/**
 * Blacklist both access and refresh tokens (typically used on logout)
 * 
 * @param accessToken - The access token to blacklist
 * @param refreshToken - The refresh token to blacklist
 * @param accessTokenTTL - Time in seconds until access token expires
 * @param refreshTokenTTL - Time in seconds until refresh token expires
 * 
 * @example
 * ```ts
 * await blacklistTokenPair(accessToken, refreshToken, 900, 604800);
 * ```
 */
export async function blacklistTokenPair(
    accessToken: string,
    refreshToken: string,
    accessTokenTTL: number,
    refreshTokenTTL: number,
): Promise<void> {
    await Promise.all([
        addToBlacklist(accessToken, accessTokenTTL),
        addToBlacklist(refreshToken, refreshTokenTTL),
    ]);
}
