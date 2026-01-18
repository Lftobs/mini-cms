import { Redis } from "@upstash/redis";
import { createHash } from "crypto";

const { UPSTASH_URL, UPSTASH_TOKEN } = import.meta.env;

const redis = new Redis({
    url: UPSTASH_URL!,
    token: UPSTASH_TOKEN!,
});

/**
 * Token Blacklist Service using Redis
 * 
 * This service manages the blacklisting of JWT tokens (both access and refresh tokens).
 * When tokens are invalidated (e.g., on logout or refresh), they are added to a Redis
 * blacklist with automatic expiry matching the token's TTL.
 */

/**
 * Hash a token using SHA-256 for storage
 * We hash tokens before storing to avoid storing raw JWTs in Redis
 * 
 * @param token - The JWT token to hash
 * @returns Hex-encoded SHA-256 hash of the token
 */
function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate Redis key for a blacklisted token
 * 
 * @param tokenHash - The hashed token
 * @returns Redis key with namespace
 */
function getBlacklistKey(tokenHash: string): string {
    return `auth:blacklist:${tokenHash}`;
}

/**
 * Add a token to the blacklist
 * 
 * @param token - The JWT token to blacklist
 * @param expiresInSeconds - Time in seconds until the token naturally expires
 *                          Redis will automatically remove the entry after this time
 * @returns Promise that resolves when token is blacklisted
 * 
 * @example
 * ```ts
 * // Blacklist an access token that expires in 15 minutes (900 seconds)
 * await addToBlacklist(accessToken, 900);
 * 
 * // Blacklist a refresh token that expires in 7 days (604800 seconds)
 * await addToBlacklist(refreshToken, 604800);
 * ```
 */
export async function addToBlacklist(
    token: string,
    expiresInSeconds: number,
): Promise<void> {
    try {
        const tokenHash = hashToken(token);
        const key = getBlacklistKey(tokenHash);

        // store in redis with TTL matching token expiry
        // value is timestamp when it was blacklisted (for debugging/auditing)
        await redis.set(key, Date.now(), {
            ex: expiresInSeconds,
        });

    } catch (error) {
        throw new Error("Failed to blacklist token");
    }
}

/**
 * Check if a token is blacklisted
 * 
 * @param token - The JWT token to check
 * @returns Promise that resolves to true if token is blacklisted, false otherwise
 * 
 * @example
 * ```ts
 * const isInvalid = await isBlacklisted(accessToken);
 * if (isInvalid) {
 *   throw new AuthenticationError('Token has been revoked');
 * }
 * ```
 */
export async function isBlacklisted(token: string): Promise<boolean> {
    try {
        const tokenHash = hashToken(token);
        const key = getBlacklistKey(tokenHash);

        // Check if key exists in Redis
        const exists = await redis.exists(key);

        return exists === 1;
    } catch (error) {
        console.error("[Blacklist] Error checking token blacklist:", error);
        throw new Error("Token validation unavailable");
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
