import { createHash } from "crypto";
import { getKV } from "../shared/kv";

/**
 * Token Blacklist Service using Cloudflare KV
 * 
 * This service manages the blacklisting of JWT tokens (both access and refresh tokens).
 * When tokens are invalidated (e.g., on logout or refresh), they are added to a KV
 * entry with automatic expiry matching the token's TTL.
 *
 * Note: Cloudflare KV is eventually consistent. A blacklisted token may remain
 * valid for up to ~60 seconds until the write propagates. Acceptable for this
 * app, but keep in mind if revocation latency matters.
 */

/**
 * Hash a token using SHA-256 for storage
 * We hash tokens before storing to avoid storing raw JWTs in KV
 * 
 * @param token - The JWT token to hash
 * @returns Hex-encoded SHA-256 hash of the token
 */
function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate KV key for a blacklisted token
 * 
 * @param tokenHash - The hashed token
 * @returns KV key with namespace
 */
function getBlacklistKey(tokenHash: string): string {
    return `auth:blacklist:${tokenHash}`;
}

/**
 * Add a token to the blacklist
 * 
 * @param token - The JWT token to blacklist
 * @param expiresInSeconds - Time in seconds until the token naturally expires
 *                          KV will automatically remove the entry after this time
 *                          (minimum supported TTL is 60 seconds)
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
    const kv = getKV();
    if (!kv) {
        throw new Error("KV binding not available");
    }

    try {
        const tokenHash = hashToken(token);
        const key = getBlacklistKey(tokenHash);

        // store in KV with TTL matching token expiry
        // value is timestamp when it was blacklisted (for debugging/auditing)
        await kv.put(key, JSON.stringify({ blacklistedAt: Date.now() }), {
            expirationTtl: Math.max(60, expiresInSeconds),
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
    const kv = getKV();
    if (!kv) {
        console.warn("[Blacklist] KV binding not available, treating token as valid");
        return false;
    }

    try {
        const tokenHash = hashToken(token);
        const key = getBlacklistKey(tokenHash);

        // Check if key exists in KV
        const value = await kv.get(key);

        return value !== null;
    } catch (error) {
        console.error("[Blacklist] Error checking token blacklist:", error);
        // On error, fail closed (assume token is valid to avoid blocking legitimate users)
        // In production, you might want to fail open or have more sophisticated error handling
        return false;
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
